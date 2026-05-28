import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccountPath!)
    });
  }
  const db = getFirestore();
  const trackId = '040d0523361ac6182771f9b5593d463d';
  await db.collection('music_tracks').doc(trackId).update({ videoGenerating: false, videoGeneratingStartedAt: null });
  console.log(`Lock cleared for track ${trackId}`);
}
main().catch(console.error);
