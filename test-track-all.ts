import { getAdminDb } from './lib/firebase-admin';

async function checkTrackEverywhere() {
    const db = getAdminDb();
    const id = '932fad09-26c7-44f8-8e2c-9e0ad9022a90';
    console.log(`Searching for ID: ${id} across ALL collections...`);
    
    try {
        const collections = await db.listCollections();
        console.log(`Found ${collections.length} collections to check.`);
        
        let found = false;
        
        for (const col of collections) {
            // Check if document ID matches
            const doc = await col.doc(id).get();
            if (doc.exists) {
                console.log(`\n✅ FOUND as DOCUMENT in collection: ${col.id}`);
                console.log(doc.data());
                found = true;
            }
            
            // Look into subcollections if necessary, or check if any document has an 'id' field matching this
            const snap = await col.where('id', '==', id).get();
            if (!snap.empty) {
                console.log(`\n✅ FOUND as 'id' MULTI in collection: ${col.id}`);
                snap.docs.forEach(d => console.log('Doc ID:', d.id));
                found = true;
            }
        }
        
        if (!found) {
            console.log("\n❌ ID not found anywhere in root collections.");
            // What if it's a subcollection? Like users/{uid}/generated_tracks?
            // Wait, we can use collectionGroup!
            console.log("\nTrying collectionGroup query on 'generated_tracks'...");
            const groupSnap = await db.collectionGroup('generated_tracks').where('id', '==', id).get();
            if (!groupSnap.empty) {
                console.log(`✅ FOUND in collectionGroup 'generated_tracks'. Paths:`, groupSnap.docs.map(d => d.ref.path));
                found = true;
            } else {
                 const groupSnap2 = await db.collectionGroup('music_tracks').where('id', '==', id).get();
                if (!groupSnap2.empty) {
                     console.log(`✅ FOUND in collectionGroup 'music_tracks'. Paths:`, groupSnap2.docs.map(d => d.ref.path));
                     found = true;
                }
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
checkTrackEverywhere();
