import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 */
export class FirestoreService {
    private db: admin.firestore.Firestore;

    constructor() {
        // Initialize Firebase if not already initialized
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: 'rraasi-8a619'
            });
        }

        this.db = admin.firestore();
        console.log('Firestore initialized');
    }

    /**
     * Get Firestore database instance
     */
    getDb(): admin.firestore.Firestore {
        return this.db;
    }

    /**
     * Get user profile by ID
     */
    async getUserProfile(userId: string) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();

            if (!userDoc.exists) {
                return null;
            }

            return {
                id: userDoc.id,
                profile: userDoc.data()
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }

    /**
     * Get subscription by email
     */
    async getSubscriptionByEmail(email: string) {
        try {
            const subscriptionsRef = this.db.collection('subscriptions');
            const snapshot = await subscriptionsRef
                .where('userEmail', '==', email)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error getting subscription:', error);
            throw error;
        }
    }
}

export const firestoreService = new FirestoreService();
