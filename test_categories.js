const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccountPath = '/Users/prakash/Documents/satsang/satsangapp/astrology_backend/backend/src/serviceAccountKey.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('music_tracks').orderBy('createdAt', 'desc').limit(500).get();
  const categories = {};
  let healingCount = 0;
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const cat = data.category || 'undefined';
    categories[cat] = (categories[cat] || 0) + 1;
    if (data.healingBenefits && data.healingBenefits.length > 0) {
      healingCount++;
    } else if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0 && data.tracks[0].healingBenefits?.length > 0) {
      healingCount++;
    }
  });
  console.log('===== CATEGORY DISTRIBUTION =====');
  console.log(JSON.stringify(categories, null, 2));
  console.log(`\nTracks with Healing Benefits: ${healingCount} out of ${snapshot.docs.length}`);
}
run().catch(console.error);
