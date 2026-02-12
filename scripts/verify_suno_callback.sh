#!/bin/bash

# Configuration
AUTH_SERVER_URL="https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-auth-server"
TIMESTAMP=$(date +%s)
TASK_ID="verify_storage_fix_${TIMESTAMP}"
TRACK_ID="track_${TIMESTAMP}"
# This is an external URL (simulating Suno). 
# If the fix works, Firestore will contain a firebasestorage.googleapis.com URL, NOT this one.
AUDIO_URL="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" 

echo "Testing Suno Callback on: $AUTH_SERVER_URL"
echo "Target Task ID: $TASK_ID"

curl -X POST "$AUTH_SERVER_URL/suno/callback?userId=test_admin_user&category=test_verification" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": 200,
    \"msg\": \"success\",
    \"data\": {
        \"callbackType\": \"complete\",
        \"task_id\": \"$TASK_ID\",
        \"data\": [
            {
                \"id\": \"$TRACK_ID\",
                \"audio_url\": \"$AUDIO_URL\",
                \"image_url\": \"https://via.placeholder.com/150.jpg\",
                \"title\": \"[TEST] Storage Verify ${TIMESTAMP}\",
                \"prompt\": \"Testing if Firebase Storage upload works\",
                \"model_name\": \"v3\",
                \"tags\": \"test, debug\",
                \"duration\": 10,
                \"createTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }
        ]
    }
}"

echo -e "\n\nRequest sent. Waiting 10 seconds for async processing..."
sleep 10

echo -e "\n\n🔎 Verifying Firestore Data..."
node scripts/verify_firestore_track.js "$TASK_ID"
