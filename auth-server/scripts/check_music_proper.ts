import { getDb } from '../src/firebase.js';

async function checkTracks() {
  const db = getDb();
  console.log("Fetching latest tracks...");
  const snap = await db.collection('music_tracks')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
      
  snap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | userId: ${data.userId} | title: ${data.title}`);
  });
  console.log("Done");
  process.exit(0);
}

checkTracks().catch(console.error);
