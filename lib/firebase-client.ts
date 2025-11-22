import type { FirebaseApp } from 'firebase/app';
// eslint-disable-next-line import/named
import { getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
// eslint-disable-next-line import/named
import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
// eslint-disable-next-line import/named
import { getFirestore } from 'firebase/firestore';

// Firebase config - complete web app configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'satsang-afbf9.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'satsang-afbf9',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'satsang-afbf9.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '184930024829',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const app = getFirebaseApp();
    auth = getAuth(app);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!db) {
    const app = getFirebaseApp();
    db = getFirestore(app);
  }
  return db;
}

export async function getRecaptchaVerifier(
  containerId: string = 'recaptcha-container'
): Promise<unknown> {
  const auth = getFirebaseAuth();

  // Import RecaptchaVerifier from firebase/auth
  const authModule = await import('firebase/auth');

  const RecaptchaVerifier = (authModule as { RecaptchaVerifier?: unknown }).RecaptchaVerifier;

  if (!RecaptchaVerifier) {
    throw new Error('RecaptchaVerifier not available. Make sure Firebase Auth is loaded.');
  }

  // Get or create the container element
  let containerElement = document.getElementById(containerId);
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.id = containerId;
    containerElement.style.display = 'none';
    document.body.appendChild(containerElement);
  }

  return new (RecaptchaVerifier as new (...args: unknown[]) => unknown)(auth, containerElement, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber
    },
  });
}
