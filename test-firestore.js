const admin = require('firebase-admin');
const serviceAccount = require('./marketing-server/rraasiServiceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('music_tracks').limit(2).get();
  snapshot.forEach(doc => {
    console.log(`\n--- Document: ${doc.id} ---`);
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2));
  });
}
run().catch(console.error);
