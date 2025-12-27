#!/bin/bash

# Test the new RRAASI Music Webhook

WEBHOOK_URL="https://rraasi-music-webhook-6ougd45dya-uc.a.run.app"
TEST_USER_ID="test_user_$(date +%s)"

echo "🧪 Testing RRAASI Music Webhook"
echo "URL: $WEBHOOK_URL"
echo "User ID: $TEST_USER_ID"
echo ""

# Test with official Suno API format
echo "📤 Sending test callback (official format)..."

curl -X POST "${WEBHOOK_URL}?userId=${TEST_USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": 200,
    "msg": "success",
    "data": {
      "callbackType": "complete",
      "task_id": "test_task_123",
      "data": [{
        "id": "test_clip_'$(date +%s)'",
        "audio_url": "https://cdn1.suno.ai/test-track.mp3",
        "source_audio_url": "https://cdn1.suno.ai/test-track.mp3",
        "stream_audio_url": "https://cdn1.suno.ai/test-track.mp3",
        "image_url": "https://cdn2.suno.ai/test-image.jpeg",
        "source_image_url": "https://cdn2.suno.ai/test-image.jpeg",
        "title": "Test Track - Webhook Verification",
        "model_name": "chirp-auk-turbo",
        "prompt": "Test prompt",
        "tags": "test, verification",
        "duration": 180,
        "createTime": "'$(date +%s)000'"
      }]
    }
  }'

echo ""
echo ""
echo "✅ Test complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check Firebase Console → Firestore → music_tracks collection"
echo "2. Look for track with userId: $TEST_USER_ID"
echo "3. Verify track data is saved correctly"
echo ""
echo "🔗 Firebase Console:"
echo "https://console.firebase.google.com/project/rraasi-8a619/firestore/data/~2Fmusic_tracks"
