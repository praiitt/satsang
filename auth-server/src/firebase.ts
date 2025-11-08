import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return;

  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    // default to repo root service account file if present
    path.resolve(process.cwd(), '..', 'satsangServiceAccount.json');

  if (!fs.existsSync(explicitPath)) {
    throw new Error(
      `Service account file not found at ${explicitPath}. Set FIREBASE_SERVICE_ACCOUNT_PATH env var to the JSON key path.`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(explicitPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  initialized = true;
}

export function getAuth() {
  if (!initialized) initFirebaseAdmin();
  return admin.auth();
}
