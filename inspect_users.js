import { initAdmin, getAdminDb } from './src/lib/firebase-admin.js';
import admin from 'firebase-admin';

async function checkUsers() {
  try {
    initAdmin();
    const db = getAdminDb();
    const snapshot = await db.collection('users').limit(5).get();
    
    console.log('--- Firestore Users Sample ---');
    snapshot.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
    
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
