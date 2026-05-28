const admin = require('firebase-admin');
const serviceAccount = require('./marketing-server/rraasiServiceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  const doc = await admin.firestore().collection('music_tracks').doc('f749652762b754763c29d3372edfd2b3').get();
  console.log(JSON.stringify(doc.data(), null, 2));
  process.exit(0);
}
run();
