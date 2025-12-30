import { config } from 'dotenv';
import * as path from 'path';
import { getDb, initFirebaseAdmin } from '../src/firebase.js';

// Load env vars from .env.local
config({ path: path.resolve(process.cwd(), '../.env.local') });

const IDS_TO_DELETE = [
    "clip_debug_001",
    "test-clip-id-123",
    "local-clip-verified",
    "test_write_verification"
];

async function cleanupTracks() {
    try {
        console.log('Cleaning up sample test tracks from Firestore...');
        initFirebaseAdmin();
        const db = getDb();

        for (const id of IDS_TO_DELETE) {
            console.log(`Attempting to delete: ${id}`);
            await db.collection('music_tracks').doc(id).delete();
            console.log(`✅ Deleted (if existed): ${id}`);
        }

    } catch (error) {
        console.error('Error cleaning up tracks:', error);
    }
}

cleanupTracks();
