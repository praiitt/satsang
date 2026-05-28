const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./satsangServiceAccount.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
    try {
        const bucket = admin.storage().bucket('rraasi-public-assets');
        const file = bucket.file('test_upload.txt');
        await file.save('Hello World from Test Script', { contentType: 'text/plain' });
        await file.makePublic();
        console.log(`✅ Upload success! Public URL: https://storage.googleapis.com/${bucket.name}/${file.name}`);
    } catch (e) {
        console.error('❌ Upload failed:', e.message);
    }
}
run();
