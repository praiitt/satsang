const admin = require('firebase-admin');
const serviceAccount = require('./auth-server/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: serviceAccount.project_id + ".appspot.com" // Usually project_id.appspot.com
});
const bucket = admin.storage().bucket();
bucket.getFiles({ prefix: '' }).then(data => {
  const files = data[0];
  const mp4Files = files.filter(f => f.name.endsWith('.mp4') || f.name.includes('video'));
  mp4Files.forEach(file => {
     console.log(file.name);
  });
}).catch(console.error);
