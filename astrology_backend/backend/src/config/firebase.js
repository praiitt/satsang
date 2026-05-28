import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import admin from 'firebase-admin';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

// Single Firebase configuration for rraasi project
const firebaseConfig = {
  apiKey: "AIzaSyBkxVOuhaVrU3Xz5M1_v0iWKKRQUwWd3TU",
  authDomain: "rraasi-8a619.firebaseapp.com",
  projectId: "rraasi-8a619",
  storageBucket: "rraasi-8a619.firebasestorage.app",
  messagingSenderId: "469389287554",
  appId: "1:469389287554:web:4482647b3c865a9d2b949b",
  measurementId: "G-KNZ2VKQ9BH"
};

const projectId = firebaseConfig.projectId;

logger.info(`Initializing Firebase for rraasi project: ${projectId}`);

// Initialize frontend Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Admin SDK synchronously
let adminAuth = null;
let adminDb = null;

// Check if Firebase Admin is already initialized
let adminApp = null;
try {
  adminApp = admin.app();
  // Already initialized - get existing services
  adminAuth = adminAuth || admin.auth();
  adminDb = adminDb || admin.firestore();
  logger.info(`Firebase Admin SDK already initialized for ${projectId}`);
} catch (error) {
  // Not initialized yet - proceed with initialization
  try {
    // Use the single rraasiServiceAccount.json file
    const serviceAccountPath = path.join(process.cwd(), 'rraasiServiceAccount.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountData);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
      
      adminAuth = admin.auth();
      adminDb = admin.firestore();
      
      logger.info(`Firebase Admin SDK initialized successfully with rraasiServiceAccount.json for ${projectId}`);
    } else {
      // Fallback to environment variable if file doesn't exist
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId
        });
        
        adminAuth = admin.auth();
        adminDb = admin.firestore();
        
        logger.info(`Firebase Admin SDK initialized successfully with service account key from environment for ${projectId}`);
      } else {
        // Try to use application default credentials as last resort
        try {
          admin.initializeApp({
            projectId: projectId
          });
          
          adminAuth = admin.auth();
          adminDb = admin.firestore();
          
          logger.info(`Firebase Admin SDK initialized with application default credentials for ${projectId}`);
        } catch (defaultCredsError) {
          logger.error('Failed to initialize with default credentials:', defaultCredsError);
          throw new Error('Firebase Admin SDK initialization failed');
        }
      }
    }
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Firebase Admin SDK initialization failed: ' + error.message);
  }
}

// Verify initialization
if (!adminDb) {
  throw new Error('Firebase Admin SDK not properly initialized - adminDb is null');
}

// Export FieldValue for use in other services
export const FieldValue = admin.firestore.FieldValue;

export { auth, db, adminAuth, adminDb, firebaseConfig, projectId };
export default app; 