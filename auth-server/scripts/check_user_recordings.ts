import { getDb } from '../src/firebase.js';

const db = getDb();

async function checkUserRecordings(userId: string) {
    console.log(`Checking recordings for user: ${userId}\n`);

    try {
        // Get all recordings for this user (no status filter)
        const snapshot = await db.collection('recordings')
            .where('userId', '==', userId)
            .orderBy('startedAt', 'desc')
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
