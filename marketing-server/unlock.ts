import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/Users/prakash/Documents/satsang/satsangapp/rraasiServiceAccount.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
async function run() {
  await db.collection("music_tracks").doc("a14fa946968150da2f7665381194d9bd").update({
    videoGenerating: false,
    videoStatus: null,
    videoUrl: null
  });
  console.log("Unlocked!");
}
run();
