import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return;

  // Try loading from environment variables first (preferred for production/cloud)
  console.log('[auth-server] Checking environment variables for Firebase Admin initialization...');
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      console.log('[auth-server] Found FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL');
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      console.log(`[auth-server] Private key length: ${privateKey.length}`);
      console.log(`[auth-server] Private key starts with: ${privateKey.substring(0, 30)}...`);
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rraasi-8a619.firebasestorage.app',
      });
      initialized = true;
      console.log('[auth-server] ✅ Initialized Firebase Admin from environment variables');
      return;
    } catch (e: any) {
      console.error('[auth-server] ❌ Failed to initialize from environment variables:', e);
      // Don't throw yet, try file fallback
    }
  } else {
    console.log('[auth-server] Environment variables for Firebase Admin are incomplete or missing.');
    if (!process.env.FIREBASE_PRIVATE_KEY) console.log('[auth-server] Missing FIREBASE_PRIVATE_KEY');
    if (!process.env.FIREBASE_CLIENT_EMAIL) console.log('[auth-server] Missing FIREBASE_CLIENT_EMAIL');
  }

  // Initialize Firebase Admin with service account
  let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    const deploymentPath = path.resolve(process.cwd(), 'rraasiServiceAccount.json');
    // In production (dist/), __dirname is .../dist. We need ../rraasiServiceAccount.json
    // In dev (src/), __dirname is .../src. Local file might be in .../ (parent of src) ie ../rraasiServiceAccount.json
    // Previous code used ../../ which implies parent of parent, valid for workspace root but not deployed function
    const localPath = path.resolve(__dirname, '../rraasiServiceAccount.json');

    console.log(`[auth-server] Debug Paths: cwd=${process.cwd()}, __dirname=${__dirname}`);
    console.log(`[auth-server] Checking paths: deployment=${deploymentPath}, local=${localPath}`);

    if (fs.existsSync(deploymentPath)) {
      serviceAccountPath = deploymentPath;
    } else if (fs.existsSync(localPath)) {
      serviceAccountPath = localPath;
    } else {
      // Try one level up just in case (original logic fallback)
      const parentPath = path.resolve(__dirname, '../../rraasiServiceAccount.json');
      if (fs.existsSync(parentPath)) {
        serviceAccountPath = parentPath;
      } else {
        serviceAccountPath = deploymentPath; // Default to deployment path for error message
      }
    }
  }

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rraasi-8a619.firebasestorage.app',
      });
      initialized = true;
      console.log(`[auth-server] ✅ Initialized Firebase Admin from file: ${serviceAccountPath}`);
      return;
    } catch (error) {
      console.error(
        `[auth-server] Failed to parse service account file: ${error}`
      );
    }
  } else {
    console.warn(
      `[auth-server] Service account file not found at: ${serviceAccountPath}`
    );
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
