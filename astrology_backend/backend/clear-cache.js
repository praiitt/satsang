import { adminDb } from './src/config/firebase.js';

async function clearCache() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const cacheDocId = `EoZTHzlHadWZxyZkxegKwxZlamY2_${dateStr}`;
    await adminDb.collection('daily_insights_cache').doc(cacheDocId).delete();
    console.log("Cache cleared for", cacheDocId);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clearCache();
