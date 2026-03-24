import { getAdminDb } from './lib/firebase-admin';

async function checkSunoId() {
    const db = getAdminDb();
    const id = '932fad09-26c7-44f8-8e2c-9e0ad9022a90';
    console.log(`Checking music_tracks where sunoId == ${id}...`);
    
    try {
        const snap = await db.collection('music_tracks').where('sunoId', '==', id).get();
        if (!snap.empty) {
            console.log(`✅ FOUND as sunoId at root! Document ID: ${snap.docs[0].id}`);
            console.log(snap.docs[0].data()?.title);
        } else {
            console.log("❌ Not found at root. Checking tracks array...");
            // Check if it's inside the tracks array: tracks is an array of objects which contain sunoId
            const arraySnap = await db.collection('music_tracks').get();
            let found = false;
            arraySnap.docs.forEach(doc => {
                 const data = doc.data();
                 if (data.tracks && Array.isArray(data.tracks)) {
                      for (const t of data.tracks) {
                          if (t.sunoId === id) {
                               console.log(`✅ FOUND inside tracks array in Document ID: ${doc.id}`);
                               console.log(data.title);
                               found = true;
                          }
                      }
                 }
            });
            if (!found) console.log("❌ Not found anywhere in music_tracks.");
        }
    } catch (e) {
        console.error(e);
    }
}
checkSunoId();
