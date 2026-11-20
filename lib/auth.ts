import type { DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from './firebaseAdmin';

export type AuthenticatedUser = DecodedIdToken;
export type AuthResult = AuthenticatedUser | NextResponse;

export function verifyFirebaseIdToken(idToken: string) {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}

export async function requireAuthenticatedUser(
  request: NextRequest,
): Promise<AuthResult> {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Se requiere un token Bearer' },
      { status: 401 },
    );
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    return NextResponse.json(
      { error: 'El token Bearer no puede estar vacío' },
      { status: 401 },
    );
  }

  try {
    return await verifyFirebaseIdToken(token);
  } catch (error) {
    console.error('No se pudo verificar el token de Firebase', error);

    return NextResponse.json(
      { error: 'Token de autenticación inválido o expirado' },
      { status: 401 },
    );
  }
}

export function isAuthError(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}
