const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./rraasiServiceAccount.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
async function fixProfile() {
    const uid = 'EoZTHzlHadWZxyZkxegKwxZlamY2';
    await db.collection('users').doc(uid).set({
        birthData: {
            name: 'Prakash',
            birthDate: '1982-07-18',
            birthTime: '09:35',
            latitude: 25.4680538,
            longitude: 85.1952852,
            placeOfBirth: 'Patna, Bihar, India',
            timezone: 5.5
        },
        chartsGenerated: true
    }, { merge: true });
    console.log('Fixed profile for', uid);
    process.exit(0);
}
fixProfile();
