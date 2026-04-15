import admin from 'firebase-admin';

const initFirebaseAdmin = () => {
    if (admin.apps.length) return admin;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('[Firebase] Warning: Missing one or more Firebase credentials. Firestore logging may not work.');
        return null;
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log('[Firebase] ✅ Admin SDK initialized');
        return admin;
    } catch (err) {
        console.error('[Firebase] ❌ Failed to initialize Admin SDK:', err);
        return null;
    }
};

export const db = initFirebaseAdmin()?.firestore();
