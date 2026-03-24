import { getAdminDb } from './lib/firebase-admin';

async function checkTrack() {
    const db = getAdminDb();
    const id = 'f5e913d148cdf9d76ec0119f734ed949';
    console.log(`Checking music_tracks where id == ${id}...`);
    
    try {
        const doc = await db.collection('music_tracks').doc(id).get();
        if (doc.exists) {
            console.log(`✅ FOUND as document ID!`);
            console.dir(doc.data(), { depth: null });
        } else {
            console.log("❌ Not found as Document ID. Checking sunoId...");
            const snap = await db.collection('music_tracks').where('sunoId', '==', id).get();
            if (!snap.empty) {
                console.log(`✅ FOUND as sunoId! Document ID: ${snap.docs[0].id}`);
                console.dir(snap.docs[0].data(), { depth: null });
            } else {
                 console.log("❌ Not found as sunoId.");
            }
        }
    } catch (e) {
        console.error(e);
    }
}
checkTrack();
