const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./satsangServiceAccount.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'rraasi-public-assets'
  });
}

async function run() {
    const db = admin.firestore();
    console.log('--- RECENT ART ---');
    const artSnap = await db.collection('spiritual_art').orderBy('createdAt', 'desc').limit(2).get();
    artSnap.forEach(doc => {
        const data = doc.data();
        console.log(`[Art] ${doc.id} | intention: ${data.intention} | publicUrl: ${data.imageDataUrl ? 'YES' : 'NO'}`);
    });

    console.log('--- RECENT REELS ---');
    const reelsSnap = await db.collection('spiritual_reels').orderBy('updatedAt', 'desc').limit(2).get();
    reelsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`[Reel] ${doc.id} | intention: ${data.intention} | status: ${data.status} | error: ${data.error || 'none'}`);
    });
}
run().catch(console.error);
