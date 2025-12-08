import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import admin from 'firebase-admin';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLaKLeWnIeAI4cpKjQK-OL0yq_Tq_oJTg",
  authDomain: "jain-temple-trust.firebaseapp.com",
  projectId: "jain-temple-trust",
  storageBucket: "jain-temple-trust.firebasestorage.app",
  messagingSenderId: "491244969919",
  appId: "1:491244969919:web:b76399c9eeb1fcc8c00b0a",
  measurementId: "G-2VQVG0H6KM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Admin (for server-side operations)
let adminApp;
if (!admin.apps.length) {
  // Only initialize admin if we have proper credentials
  const hasValidCredentials = process.env.FIREBASE_CLIENT_EMAIL && 
                             process.env.FIREBASE_PRIVATE_KEY;

  if (hasValidCredentials) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "jain-temple-trust",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://jain-temple-trust.firebaseio.com"
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.warn('Firebase Admin initialization failed:', error.message);
      console.log('Running in development mode without Firebase Admin');
      adminApp = null;
    }
  } else {
    console.log('Firebase credentials not configured, running in development mode');
    adminApp = null;
  }
} else {
  adminApp = admin.app();
}

export const adminAuth = adminApp ? adminApp.auth() : null;
export const adminDb = adminApp ? adminApp.firestore() : null;

export default app; 