import * as admin from 'firebase-admin';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../rraasiServiceAccount.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
});

const db = admin.firestore();

async function checkUserRecordings(userId: string) {
    console.log(`Checking recordings for user: ${userId}\n`);

    try {
        // Get all recordings for this user (no status filter)
        const snapshot = await db.collection('recordings')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log('No recordings found for this user.');
            return;
        }

        console.log(`Found ${snapshot.size} recording(s):\n`);

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Recording ${index + 1}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  Status: ${data.status || 'N/A'}`);
            console.log(`  Room: ${data.roomName || 'N/A'}`);
            console.log(`  URL: ${data.publicUrl || 'N/A'}`);
            console.log(`  Created: ${data.createdAt?.toDate?.() || data.createdAt || 'N/A'}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error fetching recordings:', error);
    } finally {
        process.exit(0);
    }
}

const userId = process.argv[2] || 'EoZTHzlHadWZxyZkxegKwxZlamY2';
checkUserRecordings(userId);
