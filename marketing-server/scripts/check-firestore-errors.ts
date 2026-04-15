
import { getDb } from './src/firebase.js';

async function main() {
  const db = getDb();
  
  console.log('--- Checking ad_briefs (variants) ---');
  const briefsSnap = await db.collection('ad_briefs').orderBy('updatedAt', 'desc').limit(10).get();
  
  for (const brief of briefsSnap.docs) {
    const data = brief.data();
    console.log(`\nBrief ID: ${brief.id} (updatedAt: ${new Date(data.updatedAt).toISOString()})`);
    
    // Check variant subcollection
    const variantsSnap = await db.collection('ad_briefs').doc(brief.id).collection('variants').get();
    variantsSnap.forEach(v => {
      const vdata = v.data();
      if (vdata.videoStatus === 'failed' || vdata.videoError) {
        console.log(`  - Variant ${v.id} FAILED:`, vdata.videoError);
        console.log(`    HeyGen Video ID: ${vdata.videoId}`);
      }
    });
  }

  console.log('\n--- Checking marketing_podcasts ---');
  const podcastsSnap = await db.collection('marketing_podcasts').orderBy('updatedAt', 'desc').limit(10).get();
  podcastsSnap.forEach(p => {
    const data = p.data();
    console.log(`\nPodcast ID: ${p.id} (status: ${data.status})`);
    data.turns?.forEach((t, i) => {
      if (t.status === 'failed') {
        console.log(`  - Turn ${i} FAILED: ${t.text.substring(0, 50)}...`);
      }
    });
  });
}

main().catch(console.error);
