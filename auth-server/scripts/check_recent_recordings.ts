
import admin from 'firebase-admin';
import { getAdminDb } from '../src/firebase.js'; // Adjust path if needed, or init directly

// Manually init if needed, but let's try to reuse or just init here
import serviceAccount from '../../rraasiServiceAccount.json' assert { type: "json" };

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'rraasi-8a619.firebasestorage.app'
    });
}

const db = admin.firestore();

async function checkRecordings() {
    console.log('Checking recent recordings...');
    const snapshot = await db.collection('recordings')
        .orderBy('startedAt', 'desc') // or 'createdAt' depending on schema
        .limit(5)
        .get();

    if (snapshot.empty) {
        console.log('No recordings found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\nID: ${doc.id}`);
        console.log(`Status: ${data.status}`);
        console.log(`Room: ${data.roomName}`);
        console.log(`Started: ${data.startedAt?.toDate()}`);
        console.log(`URL: ${data.publicUrl}`);
        console.log('-------------------');
    });
}

checkRecordings().catch(console.error);
