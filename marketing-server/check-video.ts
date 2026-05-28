import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/Users/prakash/Documents/satsang/satsangapp/rraasiServiceAccount.json', 'utf8'));
try { initializeApp({ credential: cert(serviceAccount) }); } catch(e) {}

const db = getFirestore();
async function run() {
  const doc = await db.collection("music_tracks").doc("a14fa946968150da2f7665381194d9bd").get();
  console.log(JSON.stringify(doc.data(), null, 2));
}
run();
