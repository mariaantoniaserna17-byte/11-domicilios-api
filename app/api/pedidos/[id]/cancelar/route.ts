import { isAuthError, requireAuthenticatedUser } from '@/lib/auth';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

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
    return NextResponse.json(
      { error: 'Pedido no encontrado.' },
      { status: 404 },
    );
  }

  const data = snapshot.data();
  if (!data || data.user_id !== auth.uid) {
    return NextResponse.json(
      { error: 'No tienes permiso para cancelar este pedido.' },
      { status: 403 },
    );
  }
  if (data.estado !== 'recibido') {
    return NextResponse.json(
      { error: 'Solo puedes cancelar pedidos con estado recibido.' },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  await reference.update({
    estado: 'cancelado',
    updated_at: now,
  });

  return NextResponse.json({
    pedido: {
      id,
      estado: 'cancelado',
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
