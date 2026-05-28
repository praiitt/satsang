const admin = require('firebase-admin');

// Ensure we don't initialize twice
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(), // or try env GOOGLE_APPLICATION_CREDENTIALS
    });
}

const db = admin.firestore();

async function checkRecentTracks() {
    try {
        const snapshot = await db.collection('music_tracks')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log("No tracks found.");
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Track ID: ${doc.id} | Title: ${data.title} | Source: ${data.source} | Status: ${data.status} | Provider: ${data.provider}`);
            if (data.source && data.source.startsWith('reading_')) {
                console.log(`-> 🎵 Reading Music Found! Provider: ${data.provider}, Status: ${data.status}`);
            }
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

checkRecentTracks();
