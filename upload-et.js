const admin = require('firebase-admin');
const serviceAccount = require('./rraasiServiceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const bucketName = 'rraasi-public-assets';
const filePath = '/Users/prakash/Downloads/ETAgent_Intro.mp4';
const destFileName = 'ETAgent_Intro.mp4';

async function uploadFile() {
  const bucket = admin.storage().bucket(bucketName);
  console.log('Uploading...');
  await bucket.upload(filePath, {
    destination: destFileName,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  console.log('Upload complete. Making public...');
  await bucket.file(destFileName).makePublic();
  console.log(`Public URL: https://storage.googleapis.com/${bucketName}/${destFileName}`);
}
uploadFile().catch(console.error);
