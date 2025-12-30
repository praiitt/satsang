
import { config } from 'dotenv';
import * as path from 'path';
import { initFirebaseAdmin, getDb } from '../src/firebase.js';

// Load env vars
config({ path: path.resolve(process.cwd(), '../.env.local') });

async function main() {
    try {
        console.log('Initializing Firebase...');
        initFirebaseAdmin();
        const db = getDb();

        console.log('Fetching tracks from Firestore...');
        const snapshot = await db.collection('music_tracks')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log('No tracks found in music_tracks collection.');
        } else {
            console.log(`Found ${snapshot.size} tracks:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- [${doc.id}] ${data.title} (${data.status})`);
            });
        }
    } catch (error) {
        console.error('Error fetching tracks:', error);
    }
}

main();
