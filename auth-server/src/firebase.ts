import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return;

  // Try loading from environment variables first (preferred for production/cloud)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    initialized = true;
    console.log('[auth-server] ✅ Initialized Firebase Admin from environment variables');
    return;
  }

  // Fallback to file-based auth
  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), '..', 'satsangServiceAccount.json');

  if (fs.existsSync(explicitPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(explicitPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log(`[auth-server] ✅ Initialized Firebase Admin from file: ${explicitPath}`);
      return;
    } catch (error) {
      console.error('[auth-server] Failed to parse service account file:', error);
    }
  }

  throw new Error(
    'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_PATH to a valid file path OR set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables.'
  );
}

export function getAuth() {
  if (!initialized) initFirebaseAdmin();
  return admin.auth();
}

export function getDb() {
  if (!initialized) initFirebaseAdmin();
  return admin.firestore();
}
