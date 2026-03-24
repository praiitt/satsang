const admin = require('firebase-admin');

try {
  const serviceAccount = require('./service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // Try default
  admin.initializeApp();
}

async function run() {
  const db = admin.firestore();
  
  const snap = await db.collection('music_tracks').orderBy('createdAt', 'desc').limit(15).get();
  console.log("Latest music tracks:");
  snap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | userId: ${data.userId} | title: ${data.title}`);
  });
}
run();
