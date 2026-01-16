// Test with orderBy now that index is enabled
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(
    fs.readFileSync('./auth-server/rraasiServiceAccount.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userId = 'bSazuUeC2IMycjMhk6UwCeBV2IA3';

console.log(`\n🔍 Testing FULL query (with orderBy) for userId: ${userId}\n`);

async function testUserTracks() {
    try {
        // Full query with orderBy (requires composite index)
        const snapshot = await db.collection('music_tracks')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        console.log(`✅ Query succeeded! Found ${snapshot.size} track(s)\n`);
        console.log('📝 Tracks (newest first):\n');

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. ${data.title || 'Untitled'}`);
            console.log(`   Status: ${data.status}`);
            console.log(`   Tracks: ${data.tracks?.length || 0} versions`);
            console.log(`   Created: ${data.createdAt?.toDate?.().toLocaleString() || 'N/A'}`);
            console.log('');
        });

        console.log('✅ Index is working correctly!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('index')) {
            console.log('\n⚠️  Index may still be building. Wait 1-2 minutes and try again.\n');
        }
    }

    process.exit(0);
}

testUserTracks();
