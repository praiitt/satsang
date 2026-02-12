
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Simulate initAdmin from lib/firebase-admin.ts
function initAdmin() {
    if (admin.apps.length > 0) return;

    const keyPath = path.resolve(process.cwd(), 'satsangServiceAccount.json');
    console.log('Loading key from:', keyPath);

    if (!fs.existsSync(keyPath)) {
        console.error('Key file not found!');
        process.exit(1);
    }

    const serviceAccount = require(keyPath);
    console.log('Project ID in key:', serviceAccount.project_id);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function checkTrack(id) {
    initAdmin();
    const db = admin.firestore();

    console.log(`Checking track ID: ${id}`);
    const doc = await db.collection('music_tracks').doc(id).get();

    if (doc.exists) {
        console.log('Track found!');
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
    } else {
        console.log('Track NOT found.');

        // Try searching by sunoId field just in case
        console.log('Searching by sunoId field...');
        const q = await db.collection('music_tracks').where('sunoId', '==', id).get();
        if (!q.empty) {
            console.log(`Found ${q.size} docs by sunoId.`);
            q.docs.forEach(d => console.log(`- Doc ID: ${d.id}`));
        } else {
            console.log('Not found by sunoId either.');
        }

        // List a few typical IDs to see format
        console.log('Sample IDs in collection:');
        const sample = await db.collection('music_tracks').limit(5).get();
        sample.docs.forEach(d => console.log(`- ${d.id}`));
    }
}

// ID from screenshot
const idToCheck = '8a8fa39b8d0ef151a2f2c66a2f779ab3';
checkTrack(idToCheck);
