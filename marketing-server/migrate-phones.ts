import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'satsangServiceAccount.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function migrate() {
  try {
    console.log('Starting migration...');
    const leadsSnap = await db.collection('facebook_leads').get();
    let updatedCount = 0;
    
    for (const doc of leadsSnap.docs) {
      const data = doc.data();
      if (data.firebaseUid && data.phone) {
        const uid = data.firebaseUid;
        
        // Check if user exists in Auth
        try {
          const authUser = await auth.getUser(uid);
          // If auth user doesn't have a phone, update it
          if (!authUser.phoneNumber) {
             console.log(`Updating Auth phone for ${authUser.email} -> ${data.phone}`);
             await auth.updateUser(uid, { phoneNumber: data.phone }).catch(e => {
                 console.log(`Failed to update Auth for ${uid}: ${e.message}`);
             });
          }
        } catch(e: any) {
            console.log(`User ${uid} not found in Auth`);
        }

        // Update in Firestore
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (!userData?.phone && !userData?.phoneNumber) {
                console.log(`Updating Firestore phone for user ${uid}`);
                await userRef.update({ phone: data.phone });
                updatedCount++;
            }
        }
      }
    }
    
    console.log(`Migration complete! Updated ${updatedCount} user documents.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
