import { getFirebaseAdminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getFirebaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

export async function POST(request: Request) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud debe ser JSON válido.' },
      { status: 400 },
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Ingresa un correo electrónico válido.' },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres.' },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: 'El nombre es obligatorio.' },
      { status: 400 },
    );
  }

  try {
    const user = await getFirebaseAdminAuth().createUser({
      displayName: name,
      email,
      password,
    });

    return NextResponse.json(
      {
        user: {
          displayName: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified,
          uid: user.uid,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const firebaseErrorCode = getFirebaseErrorCode(error);

    if (firebaseErrorCode) {
      if (firebaseErrorCode === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con ese correo.' },
          { status: 409 },
        );
      }

      if (
        firebaseErrorCode === 'auth/invalid-email' ||
        firebaseErrorCode === 'auth/password-does-not-meet-requirements'
      ) {
        return NextResponse.json(
          { error: 'Los datos de registro no son válidos.' },
          { status: 400 },
        );
      }
    }

    console.error('Error al registrar usuario en Firebase', error);

    return NextResponse.json(
      { error: 'No fue posible crear el usuario.' },
      { status: 500 },
    );
  }
}
