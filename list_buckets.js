const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./satsangServiceAccount.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
    try {
        const [buckets] = await admin.storage().bucket('test').storage.getBuckets();
        console.log('Buckets:', buckets.map(b => b.name));
    } catch (e) {
        console.error(e);
    }
}
run();
