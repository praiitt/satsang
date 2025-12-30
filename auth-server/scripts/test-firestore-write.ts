
import { config } from 'dotenv';
import * as path from 'path';
import { getDb, initFirebaseAdmin } from '../src/firebase.js';
import admin from 'firebase-admin';

// Load env vars from .env.local
config({ path: path.resolve(process.cwd(), '../.env.local') });

async function testFirestoreWrite() {
    try {
        console.log('Testing Firestore Write Access...');

        // Force init
        initFirebaseAdmin();
        const db = getDb();

        // Create a test document
        const testRef = db.collection('music_tracks').doc('test_write_verification');
        const testData = {
            title: 'Test Track Verification',
            status: 'TESTING',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            message: 'This is a test write to verify permissions.'
        };

        await testRef.set(testData);
        console.log('✅ Successfully wrote test document to music_tracks/test_write_verification');

        // Verify read back
        const doc = await testRef.get();
        if (doc.exists) {
            console.log('✅ Successfully read back the test document:', doc.data());
        } else {
            console.error('❌ Failed to read back the test document (it does not exist).');
        }

    } catch (error: any) {
        console.error('❌ Error testing Firestore write:', error);
    }
}

testFirestoreWrite();
