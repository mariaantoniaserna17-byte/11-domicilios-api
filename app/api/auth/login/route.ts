import { verifyFirebaseIdToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

type LoginBody = {
  idToken?: unknown;
  token?: unknown;
  email?: unknown;
  password?: unknown;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || undefined;
}

function getFirebaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

export async function POST(request: Request) {
  let body: LoginBody = {};

  try {
    const parsedBody = await request.json();
    if (typeof parsedBody === 'object' && parsedBody !== null) {
      body = parsedBody as LoginBody;
    }
  } catch {
    // An empty body can still use the Authorization header.
  }

  const bodyToken =
    typeof body.idToken === 'string'
      ? body.idToken.trim()
      : typeof body.token === 'string'
        ? body.token.trim()
        : undefined;
  const idToken = bodyToken || getBearerToken(request);

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  let resolvedIdToken = idToken;

  if (!resolvedIdToken) {
    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            'Envía correo y contraseña o un Firebase ID token en idToken, token o Authorization: Bearer.',
        },
        { status: 400 },
      );
    }

    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!firebaseApiKey) {
      console.error('Falta FIREBASE_WEB_API_KEY');

      return NextResponse.json(
        { error: 'La autenticación no está disponible temporalmente.' },
        { status: 500 },
      );
    }

    try {
      const firebaseResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      const firebaseBody = (await firebaseResponse.json()) as {
        idToken?: string;
        error?: { message?: string };
      };

      if (!firebaseResponse.ok) {
        const code = firebaseBody.error?.message;

        if (
          code === 'EMAIL_NOT_FOUND' ||
          code === 'INVALID_PASSWORD' ||
          code === 'INVALID_LOGIN_CREDENTIALS' ||
          code === 'USER_DISABLED'
        ) {
          return NextResponse.json(
            { error: 'Correo o contraseña incorrectos.' },
            { status: 401 },
          );
        }

        if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
          return NextResponse.json(
            { error: 'Demasiados intentos. Espera unos minutos.' },
            { status: 429 },
          );
        }

        return NextResponse.json(
          { error: 'No fue posible iniciar sesión.' },
          { status: 401 },
        );
      }

      resolvedIdToken = firebaseBody.idToken;
    } catch (error) {
      console.error('Error al conectar con Firebase Identity Toolkit', error);

      return NextResponse.json(
        { error: 'No fue posible iniciar sesión.' },
        { status: 500 },
      );
    }
  }

  if (!resolvedIdToken) {
    return NextResponse.json(
      { error: 'No fue posible obtener el token de sesión.' },
      { status: 400 },
    );
  }

  try {
    const user = await verifyFirebaseIdToken(resolvedIdToken);

    return NextResponse.json({
      token: resolvedIdToken,
      user: {
        displayName: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.email_verified ?? false,
        uid: user.uid,
      },
    });
  } catch (error) {
    const firebaseErrorCode = getFirebaseErrorCode(error);

    if (firebaseErrorCode) {
      console.error('Token de inicio de sesión inválido', error);

      return NextResponse.json(
        { error: 'El token de Firebase es inválido o expiró.' },
        { status: 401 },
      );
    }

    console.error('Error interno al validar el token de inicio de sesión', error);

    return NextResponse.json(
      { error: 'No fue posible validar la sesión.' },
      { status: 500 },
    );
  }
}
