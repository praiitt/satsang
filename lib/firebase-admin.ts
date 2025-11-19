import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

let initialized = false;

function init() {
  // Check if Firebase app is already initialized
  try {
    if (admin.apps.length > 0) {
      initialized = true;
      return;
    }
  } catch {
    // If checking apps fails, continue with initialization
  }

  if (initialized) return;

  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), 'satsangServiceAccount.json');

  if (!fs.existsSync(explicitPath)) {
    throw new Error(
      `Service account file not found at ${explicitPath}. Set FIREBASE_SERVICE_ACCOUNT_PATH env var to the JSON key path.`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(explicitPath, 'utf8'));
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    initialized = true;
  } catch (error: unknown) {
    const err = error as { code?: string };
    // If app already exists, that's fine - just mark as initialized
    if (err.code === 'app/already-exists') {
      initialized = true;
      return;
    }
    throw error;
  }
}

export function getAdminDb() {
  init();
  return admin.firestore();
}
