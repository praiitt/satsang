const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./satsangServiceAccount.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function run() {
    const db = admin.firestore();
    const snap = await db.collection('spiritual_art').where('isPublic', '==', false).get();
    const batch = db.batch();
    snap.docs.forEach(doc => {
        batch.update(doc.ref, { isPublic: true });
    });
    await batch.commit();
    console.log(`Updated ${snap.size} artworks to be public.`);
}
run().catch(console.error);
