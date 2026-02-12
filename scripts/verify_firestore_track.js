
const admin = require('firebase-admin');
const serviceAccount = require('../rraasiServiceAccount.json');

// Get Task ID from arg or use the one we just generated (hard to pass dynamic var, so let's accept arg)
const taskId = process.argv[2];

if (!taskId) {
    console.error("Please provide a Task ID to verify.");
    process.exit(1);
}

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function verifyTrack() {
    console.log(`🔍 Inspecting Firestore Doc ID: ${taskId}...`);

    try {
        const doc = await db.collection('music_tracks').doc(taskId).get();

        if (!doc.exists) {
            console.log('❌ Document not found. Callback might have failed or is still processing.');
            return;
        }

        const data = doc.data();
        const tracks = data.tracks || [];

        console.log(`✅ Document Found!`);
        console.log(`Title: ${data.title}`);
        console.log(`Status: ${data.status}`);

        if (tracks.length > 0) {
            const track = tracks[0];
            console.log(`\n--- Track Details ---`);
            console.log(`Suno ID: ${track.sunoId}`);
            console.log(`Audio URL: ${track.audioUrl}`);
            console.log(`Image URL: ${track.imageUrl}`);

            const isStorageUrl = track.audioUrl && track.audioUrl.includes('storage.googleapis.com');
            const isSunoUrl = track.audioUrl && (track.audioUrl.includes('suno') || track.audioUrl.includes('actions.google.com'));

            if (isStorageUrl) {
                console.log(`\n✅ SUCCESS: Audio URL is a Firebase Storage Link!`);
            } else if (isSunoUrl) {
                console.log(`\n❌ FAILURE: Audio URL is still the Source URL (Suno/Google). Upload failed.`);
            } else {
                console.log(`\n⚠️ UNKNOWN: URL domain not recognized. Check manually.`);
            }
        } else {
            console.log('❌ No tracks array found in document.');
        }

    } catch (error) {
        console.error('❌ Error querying document:', error);
    }
}

verifyTrack();
