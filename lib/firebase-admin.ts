import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

let initialized = false;

export function initAdmin() {
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

  // 1. Try environment variable credentials (preferred for Cloud Run)
  const envCreds =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS;

  if (envCreds) {
    try {
      let serviceAccount;
      if (envCreds.trim().startsWith('{')) {
        serviceAccount = JSON.parse(envCreds);
      } else {
        // Assume base64
        serviceAccount = JSON.parse(Buffer.from(envCreds, 'base64').toString('utf8'));
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      return;
    } catch (e) {
      console.warn('Failed to parse credential from env var, falling back to file path', e);
    }
  }

  // 2. Fallback to file path (local development)
  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), 'satsangServiceAccount.json');

  if (!fs.existsSync(explicitPath)) {
    throw new Error(
      `Service account file not found at ${explicitPath}. Set FIREBASE_SERVICE_ACCOUNT_JSON or LIVEKIT_EGRESS_GCP_CREDENTIALS env var, or check the file path.`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(explicitPath, 'utf8'));
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rraasi-8a619.appspot.com',
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

// Export getAdminDb as the primary way to access Firestore
export function getAdminDb() {
  initAdmin();
  return admin.firestore();
}

// Export getAdminAuth for server-side Firebase ID token verification
export function getAdminAuth() {
  initAdmin();
  return admin.auth();
}

// Export getAdminStorage for uploading media
export function getAdminStorage() {
  initAdmin();
  return admin.storage();
}
