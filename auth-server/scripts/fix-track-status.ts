import { config } from 'dotenv';
import * as path from 'path';
import { getDb, initFirebaseAdmin } from '../src/firebase.js';

// Load env vars from .env.local
config({ path: path.resolve(process.cwd(), '../.env.local') });

async function fixStatus() {
    try {
        console.log('Migrating track status to SUCCESS...');
        initFirebaseAdmin();
        const db = getDb();

        const snapshot = await db.collection('music_tracks').where('status', '==', 'COMPLETED').get();

        if (snapshot.empty) {
            console.log('No tracks found with status COMPLETED.');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            console.log(`Updating ${doc.id}`);
            batch.update(doc.ref, { status: 'SUCCESS' });
        });

        await batch.commit();
        console.log(`✅ Updated ${snapshot.size} tracks.`);

    } catch (error) {
        console.error('Error fixing status:', error);
    }
}

fixStatus();
