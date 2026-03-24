import { getAdminDb } from './lib/firebase-admin';

async function checkTrack() {
    const db = getAdminDb();
    const id = '932fad09-26c7-44f8-8e2c-9e0ad9022a90';
    console.log(`Checking doc in music_tracks with id: ${id}`);
    const doc = await db.collection('music_tracks').doc(id).get();
    
    if (doc.exists) {
        console.log("Track found in music_tracks by ID!");
        console.log(doc.data());
    } else {
        console.log("Not found in music_tracks by ID.");
        // Try to query by ID field if any
        const snap = await db.collection('music_tracks').where('id', '==', id).get();
        if (!snap.empty) {
            console.log("Found in music_tracks by 'id' field, but under document IDs:", snap.docs.map(d => d.id));
        } else {
            console.log("Not found in music_tracks by 'id' field either.");
        }
    }
}
checkTrack();
