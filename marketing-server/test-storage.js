const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "rraasi-80862.appspot.com" // or whatever the project ID is
});
const bucket = admin.storage().bucket();
bucket.getFiles({ prefix: '' }).then(data => {
  const files = data[0];
  files.forEach(file => console.log(file.name));
}).catch(console.error);
