const admin = require('firebase-admin');
const serviceAccount = require('../rraasiServiceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugRecordings() {
    const userId = 'EoZTHzlHadWZxyZkxegKwxZlamY2';

    console.log('=== Testing Different Queries ===\n');

    // Query 1: Just userId
    console.log('Query 1: Just userId filter');
    const q1 = await db.collection('recordings')
        .where('userId', '==', userId)
        .limit(5)
        .get();
    console.log(`  Found: ${q1.size} documents`);

    if (q1.size > 0) {
        const firstDoc = q1.docs[0].data();
        console.log(`  First doc ID:`, q1.docs[0].id);
        console.log(`  First doc fields:`, Object.keys(firstDoc));
        console.log(`  userId:`, firstDoc.userId);
        console.log(`  status:`, firstDoc.status);
        console.log(`  createdAt:`, firstDoc.createdAt);
        console.log(`  createdAt type:`, typeof firstDoc.createdAt, firstDoc.createdAt?.constructor?.name);
    }

    // Query 2: userId + orderBy createdAt
    console.log('\nQuery 2: userId + orderBy createdAt');
    try {
        const q2 = await db.collection('recordings')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        console.log(`  Found: ${q2.size} documents`);
    } catch (e) {
        console.log(`  Error: ${e.message}`);
    }

    process.exit(0);
}

debugRecordings().catch(console.error);
