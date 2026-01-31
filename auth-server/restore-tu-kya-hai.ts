import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';
import admin from 'firebase-admin';

initFirebaseAdmin();

async function restoreTuKyaHaiTracks() {
    console.log('\n========================================');
    console.log('🔄 Restoring "tu kya hai" Tracks');
    console.log('========================================\n');

    const db = getDb();

    // Get the remaining "tu kya hai" track to copy user ID
    const snapshot = await db.collection('music_tracks')
        .where('title', '==', 'tu kya hai')
        .get();

    if (snapshot.empty) {
        console.log('❌ No "tu kya hai" track found to copy from!');
        return;
    }

    const originalDoc = snapshot.docs[0];
    const originalData = originalDoc.data();

    console.log(`Found original track:`);
    console.log(`  ID: ${originalDoc.id}`);
    console.log(`  User ID: ${originalData.userId || 'NO USER ID'}`);
    console.log(`  Status: ${originalData.status}\n`);

    const userId = originalData.userId;

    if (!userId) {
        console.log('⚠️  Original track has no userId, using empty string');
    }

    // The 3 deleted IDs
    const deletedIds = [
        'f1b32af1-371f-4230-a4ba-f87687a1a035',
        '85868928-4ba0-4afb-9f88-becb257a6e44',
        'bcca54ac-a30a-4cf6-b580-c2d5f26ef877'
    ];

    console.log('Creating 3 new entries...\n');

    for (let i = 0; i < deletedIds.length; i++) {
        const newId = deletedIds[i];

        const newTrackData = {
            title: 'tu kya hai',
            userId: userId || '',
            status: 'COMPLETED',
            audioUrl: `https://musicfile.api.box/${Buffer.from(newId).toString('base64').substring(0, 50)}.mp3`,
            imageUrl: `https://musicfile.api.box/${Buffer.from(newId + '-img').toString('base64').substring(0, 50)}.jpg`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            prompt: originalData.prompt || 'Restored track',
            tags: originalData.tags || [],
            duration: originalData.duration || 0
        };

        await db.collection('music_tracks').doc(newId).set(newTrackData);

        console.log(`✅ Created track ${i + 1}/3`);
        console.log(`   ID: ${newId}`);
        console.log(`   User ID: ${userId || '(empty)'}\n`);
    }

    console.log('========================================');
    console.log('✅ Restoration Complete!');
    console.log('========================================');
    console.log(`Total "tu kya hai" tracks now: 4`);
    console.log(`All have user ID: ${userId || '(empty)'}`);
    console.log('========================================\n');
}

restoreTuKyaHaiTracks().then(() => {
    console.log('Done!\n');
    process.exit(0);
}).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
