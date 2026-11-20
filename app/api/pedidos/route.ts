import { isAuthError, requireAuthenticatedUser } from '@/lib/auth';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const restaurant = { lat: 6.2442, lng: -75.5812 };
const coverageKm = 8;
const baseShippingCentavos = 500000;
const perKmShippingCentavos = 50000;

const products = {
  'sample-burger': {
    name: 'Hamburguesa de la casa',
    priceCentavos: 2800000,
  },
  'sample-pizza': {
    name: 'Pizza napolitana',
    priceCentavos: 3200000,
  },
  'sample-lemonade': {
    name: 'Limonada natural',
    priceCentavos: 900000,
  },
  'sample-tacos': {
    name: 'Tacos mexicanos',
    priceCentavos: 2000000,
  },
  'bandeja-paisa-miniatura': {
    name: 'Bandeja paisa miniatura',
    priceCentavos: 2200000,
  },
  'empanadas-caseras': {
    name: 'Empanadas caseras',
    priceCentavos: 450000,
  },
  'patacon-con-todo': {
    name: 'Patacón con todo',
    priceCentavos: 1600000,
  },
  'jugo-lulo-leche': {
    name: 'Jugo de lulo en leche',
    priceCentavos: 600000,
  },
  'salchipapa-artesanal': {
    name: 'Salchipapa artesanal',
    priceCentavos: 1200000,
  },
} as const;

const createOrderSchema = z.object({
  address: z.string().trim().min(3),
  lat: z.number().finite(),
  lng: z.number().finite(),
  notes: z.string().trim().max(500).nullable(),
  items: z
    .array(
      z.object({
        productoId: z.enum([
          'sample-burger',
          'sample-pizza',
          'sample-lemonade',
          'sample-tacos',
          'bandeja-paisa-miniatura',
          'empanadas-caseras',
          'patacon-con-todo',
          'jugo-lulo-leche',
          'salchipapa-artesanal',
        ]),
        cantidad: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});

function haversineDistanceKm(lat: number, lng: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(lat - restaurant.lat);
  const deltaLng = toRadians(lng - restaurant.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(restaurant.lat)) *
      Math.cos(toRadians(lat)) *
      Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud debe ser JSON válido.' },
      { status: 400 },
    );
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Datos de pedido inválidos.',
        detalles: parsed.error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensaje: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const distanceKm = haversineDistanceKm(parsed.data.lat, parsed.data.lng);
  if (distanceKm > coverageKm) {
    return NextResponse.json(
      { error: 'Estás fuera de la zona de cobertura de 8 km.' },
      { status: 400 },
    );
  }

  const items = parsed.data.items.map((item) => {
    const product = products[item.productoId];
    return {
      producto_id: item.productoId,
      nombre: product.name,
      cantidad: item.cantidad,
      precio_centavos: product.priceCentavos,
    };
  });
  const subtotalCentavos = items.reduce(
    (total, item) => total + item.precio_centavos * item.cantidad,
    0,
  );
  const envioCentavos =
    baseShippingCentavos +
    Math.ceil(distanceKm) * perKmShippingCentavos;
  const totalCentavos = subtotalCentavos + envioCentavos;
  const now = new Date().toISOString();
  const id = `pedido-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const firestore = getFirestore(getFirebaseAdminApp());
  const document = {
    id,
    user_id: auth.uid,
    estado: 'recibido',
    total_centavos: totalCentavos,
    envio_centavos: envioCentavos,
    direccion: parsed.data.address,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    notas: parsed.data.notes,
    items,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await firestore.collection('pedidos').doc(id).set(document);

  return NextResponse.json(
    {
      pedido: {
        id,
        estado: document.estado,
        totalCentavos,
        envioCentavos,
        direccion: document.direccion,
        lat: document.lat,
        lng: document.lng,
        notas: document.notas,
        items,
        creadoEn: now,
      },
    },
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (isAuthError(auth)) return auth;

  const firestore = getFirestore(getFirebaseAdminApp());
  const snapshot = await firestore
    .collection('pedidos')
    .where('user_id', '==', auth.uid)
    .orderBy('created_at', 'desc')
    .get();

  const pedidos = snapshot.docs
    .filter((doc) => doc.data().deleted_at === null)
    .map((doc) => {
      const data = doc.data();
      return {
        id: data.id ?? doc.id,
        estado: data.estado,
        totalCentavos: data.total_centavos,
        envioCentavos: data.envio_centavos,
        direccion: data.direccion,
        lat: data.lat,
        lng: data.lng,
        notas: data.notas ?? null,
        items: data.items ?? [],
        creadoEn: data.created_at,
      };
    });

  return NextResponse.json({ pedidos });
}
