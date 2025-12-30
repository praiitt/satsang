import { config } from 'dotenv';
import * as path from 'path';
import { getDb, initFirebaseAdmin } from '../src/firebase.js';

// Load env vars from .env.local
config({ path: path.resolve(process.cwd(), '../.env.local') });

async function listAllTrackIds() {
    try {
        initFirebaseAdmin();
        const db = getDb();
        const snapshot = await db.collection('music_tracks').select('sunoId', 'title').get();

        console.log("--- START TRACK LIST ---");
        snapshot.docs.forEach(doc => {
            console.log(doc.id); // Doc ID is usually Suno ID
        });
        console.log("--- END TRACK LIST ---");

    } catch (error) {
        console.error('Error listing tracks:', error);
    }
}

listAllTrackIds();
