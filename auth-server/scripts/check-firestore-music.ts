
import { config } from 'dotenv';
import * as path from 'path';
import { getDb, initFirebaseAdmin } from '../src/firebase.js';
import admin from 'firebase-admin';

// Load env vars from .env.local
config({ path: path.resolve(process.cwd(), '../.env.local') });

async function checkMusicTracks() {
    try {
        console.log('Checking recent music tracks in Firestore...');

        // Force init and get app
        initFirebaseAdmin();
        const app = admin.app();
        console.log('Firebase App Name:', app.name);
        console.log('Firebase Project ID (from options):', app.options.credential?.projectId || app.options.projectId);

        // Check if we can list collections (basic connectivity)
        const db = getDb();
        const collections = await db.listCollections();
        console.log('Collectionsfound:', collections.map(c => c.id).join(', '));

        // Query last 5 tracks
        const snapshot = await db
            .collection('music_tracks')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log('No music tracks found.');
            return;
        }

        console.log(`Found ${snapshot.docs.length} recent tracks:`);
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`[${doc.id}] ${data.title} (${data.status})`);
        });

    } catch (error: any) {
        console.error('Error checking music tracks:', error);
        if (error.code === 5) {
            console.error("NOT_FOUND Error: This usually means the Project ID is wrong or the Firestore Database doesn't exist yet.");
            console.error("Please check:");
            console.error("1. Is the Project ID 'rraasi-8a619' correct?");
            console.error("2. Have you created a Firestore Native database in the console?");
        }
    }
}

checkMusicTracks();
