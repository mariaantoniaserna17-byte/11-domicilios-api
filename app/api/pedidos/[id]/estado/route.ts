import { isAuthError, requireAuthenticatedUser } from '@/lib/auth';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const nextStatus: Record<string, string> = {
  recibido: 'preparando',
  preparando: 'en_camino',
  en_camino: 'entregado',
};

const statusSchema = z.object({
  estado: z.enum(['preparando', 'en_camino', 'entregado']).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  const firestore = getFirestore(getFirebaseAdminApp());
  const reference = firestore.collection('pedidos').doc(id);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  const data = snapshot.data();
  if (!data || data.user_id !== auth.uid) {
    return NextResponse.json(
      { error: 'No tienes permiso para modificar este pedido.' },
      { status: 403 },
    );
  }

  const expectedStatus = nextStatus[data.estado];
  if (!expectedStatus) {
    return NextResponse.json(
      { error: 'El pedido ya no puede avanzar desde su estado actual.' },
      { status: 409 },
    );
  }

  let requestedStatus: string | undefined;
  const rawBody = await request.text();
  if (rawBody.trim()) {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser JSON válido.' },
        { status: 400 },
      );
    }

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'El estado solicitado no es válido.' },
        { status: 400 },
      );
    }
    requestedStatus = parsed.data.estado;
  }

  if (requestedStatus && requestedStatus !== expectedStatus) {
    return NextResponse.json(
      { error: `El siguiente estado válido es "${expectedStatus}".` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  await reference.update({
    estado: expectedStatus,
    updated_at: now,
  });

  return NextResponse.json({
    pedido: {
      id,
      estado: expectedStatus,
      totalCentavos: data.total_centavos,
      envioCentavos: data.envio_centavos,
      direccion: data.direccion,
      lat: data.lat,
      lng: data.lng,
      notas: data.notas ?? null,
      items: data.items ?? [],
      creadoEn: data.created_at,
    },
  });
}
