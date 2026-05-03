import admin from 'firebase-admin';
import * as path from 'path';
import { generateSearchTerms } from '../src/utils/searchUtils';

import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../marketing-server/rraasiServiceAccount.json'), 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrate() {
    let migratedCount = 0;
    
    console.log('Starting migration to add search_terms to music_tracks...');
    const snapshot = await db.collection('music_tracks').get();
    
    const batchArray = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const terms = generateSearchTerms(data);
        
        currentBatch.update(doc.ref, { search_terms: terms });
        operationCount++;
        migratedCount++;
        
        if (operationCount >= 400) {
            batchArray.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
        }
    }
    
    if (operationCount > 0) {
        batchArray.push(currentBatch);
    }
    
    for (const batch of batchArray) {
        await batch.commit();
        console.log(`Committed a batch. Total so far: ${migratedCount}`);
    }
    
    console.log(`Migration completed successfully! Migrated ${migratedCount} tracks.`);
}

migrate().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
