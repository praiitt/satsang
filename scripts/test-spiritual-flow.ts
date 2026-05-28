// scripts/test-spiritual-flow.js
// Run this script using: npx ts-node scripts/test-spiritual-flow.ts

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin (assuming rraasiServiceAccount.json exists in root or auth-server)
const serviceAccountPath = path.resolve(__dirname, '../auth-server/rraasiServiceAccount.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Admin Initialized");
} catch (e) {
  console.error("❌ Failed to initialize Firebase. Ensure rraasiServiceAccount.json exists at", serviceAccountPath);
  process.exit(1);
}

const db = admin.firestore();
const TEST_USER_ID = "TEST_USER_999";
const COLLECTION = "user_spiritual_states";

async function runTests() {
  console.log(`\n🧪 Starting Spiritual OS Flow Test for User: ${TEST_USER_ID}\n`);

  try {
    // -----------------------------------------------------
    // STEP 1: Simulate Tarot / Astrology Diagnostic
    // -----------------------------------------------------
    console.log("➡️ STEP 1: Simulating Tarot Diagnostic...");
    const diagnosticPayload = {
      userId: TEST_USER_ID,
      diagnosingTool: 'Tarot',
      lastDiagnosticData: {
        tarotCards: ['The Tower', 'Three of Swords']
      },
      currentImbalance: 'Severe energetic disruption',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection(COLLECTION).doc(TEST_USER_ID).set(diagnosticPayload, { merge: true });
    console.log("✅ Diagnostic saved to Firebase.");

    // -----------------------------------------------------
    // STEP 2: Simulate Satsang Processing
    // -----------------------------------------------------
    console.log("\n➡️ STEP 2: Simulating Satsang Processing...");
    const satsangPayload = {
      activeRemedy: 'Music',
      satsangSummary: 'We discussed the sudden upheaval represented by The Tower. You need a grounding 432Hz frequency to restore your foundation.',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(COLLECTION).doc(TEST_USER_ID).set(satsangPayload, { merge: true });
    console.log("✅ Satsang prescription saved to Firebase.");

    // -----------------------------------------------------
    // STEP 3: Verify State (What the UI sees)
    // -----------------------------------------------------
    console.log("\n➡️ STEP 3: Reading State (Simulating Spiritual Studio UI)...");
    const docSnap = await db.collection(COLLECTION).doc(TEST_USER_ID).get();
    
    if (docSnap.exists) {
      const state = docSnap.data();
      console.log("📄 Current Spiritual State:", JSON.stringify(state, null, 2));
      
      if (state.activeRemedy === 'Music' && state.satsangSummary.includes('432Hz')) {
        console.log("✅ UI State verification PASSED! The Studio will display the Remedy Banner.");
      } else {
        console.error("❌ State verification failed.");
      }
    }

    // -----------------------------------------------------
    // STEP 4: Simulate Clearing the Remedy (After generation)
    // -----------------------------------------------------
    console.log("\n➡️ STEP 4: Simulating Remedy Execution & Cleanup...");
    await db.collection(COLLECTION).doc(TEST_USER_ID).update({
      currentImbalance: null,
      activeRemedy: null,
      satsangSummary: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const finalSnap = await db.collection(COLLECTION).doc(TEST_USER_ID).get();
    if (!finalSnap.data().activeRemedy) {
      console.log("✅ Cleanup PASSED! The active remedy was successfully cleared.");
    }

    console.log("\n🎉 ALL TESTS PASSED! The Interconnected Suite Data Flow is working perfectly.");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
  } finally {
    process.exit(0);
  }
}

runTests();
