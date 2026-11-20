import { NextResponse } from 'next/server';

type ForgotPasswordBody = {
  email?: unknown;
};

export async function POST(request: Request) {
  let body: ForgotPasswordBody;

  try {
    body = (await request.json()) as ForgotPasswordBody;
  } catch {
    return NextResponse.json(
      { error: 'Envía un correo electrónico válido.' },
      { status: 400 },
    );
  }

  const email = typeof body.email === 'string'
    ? body.email.trim().toLowerCase()
    : '';

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Ingresa un correo electrónico válido.' },
      { status: 400 },
    );
  }

  const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!firebaseApiKey) {
    console.error('Falta FIREBASE_WEB_API_KEY');
    return NextResponse.json(
      { error: 'La recuperación de contraseña no está disponible temporalmente.' },
      { status: 500 },
    );
  }

  try {
    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`,
      {
        body: JSON.stringify({
          email,
          requestType: 'PASSWORD_RESET',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    );

    const firebaseBody = (await firebaseResponse.json()) as {
      error?: { message?: string };
    };

    if (!firebaseResponse.ok) {
      const code = firebaseBody.error?.message;
      if (code !== 'EMAIL_NOT_FOUND') {
        console.error('Firebase rechazó la recuperación de contraseña', code);
      }
    }

    return NextResponse.json({
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.',
    });
  } catch (error) {
    console.error('Error al solicitar recuperación de contraseña', error);
    return NextResponse.json(
      { error: 'No fue posible enviar el correo de recuperación.' },
      { status: 502 },
    );
  }
}
