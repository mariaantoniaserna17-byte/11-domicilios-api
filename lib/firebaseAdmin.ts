import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let firebaseAdminApp: App | undefined;
let firebaseAdminAuth: Auth | undefined;

function getFirebaseCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY',
    );
  }

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  firebaseAdminApp = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert(getFirebaseCredentials()),
      });

  return firebaseAdminApp;
}

export function getFirebaseAdminAuth(): Auth {
  if (!firebaseAdminAuth) {
    firebaseAdminAuth = getAuth(getFirebaseAdminApp());
  }

  return firebaseAdminAuth;
}
