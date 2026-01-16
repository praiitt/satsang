#!/bin/bash

# Test the my-tracks API endpoint directly
# This bypasses frontend and tests auth-server directly

echo "Testing /suno/my-tracks endpoint..."
echo ""

# Test with the known userId
USER_ID="bSazuUeC2IMycjMhk6UwCeBV2IA3"

echo "📍 Testing LOCAL auth-server (port 4000)"
echo "Expected: Should return 401 (requires auth cookie)"
echo ""

# Test 1: Without authentication (should fail with 401)
echo "Test 1: No authentication"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  http://localhost:4000/suno/my-tracks

echo ""
echo "---"
echo ""

# Test 2: Direct Firestore query simulation
echo "Test 2: Direct Firestore query for userId: $USER_ID"
echo "(Running node script...)"
echo ""

node << 'EOF'
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(
  fs.readFileSync('./auth-server/rraasiServiceAccount.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const userId = 'bSazuUeC2IMycjMhk6UwCeBV2IA3';

async function test() {
  console.log(`Querying: music_tracks where userId == ${userId}`);
  
  const snapshot = await db.collection('music_tracks')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  
  console.log(`\n✅ Found ${snapshot.size} tracks\n`);
  
  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`${i+1}. ${data.title || 'Untitled'}`);
    console.log(`   audioUrl: ${data.audioUrl ? 'YES' : 'NO'}`);
    console.log(`   tracks array: ${data.tracks?.length || 0} items`);
    if (data.tracks && data.tracks.length > 0) {
      console.log(`   First track audioUrl: ${data.tracks[0].audioUrl ? 'YES' : 'NO'}`);
    }
    console.log('');
  });
  
  process.exit(0);
}

test().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
EOF
