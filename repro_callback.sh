#!/bin/bash
AUTH_URL="https://satsang-auth-server-6ougd45dya-el.a.run.app/suno/callback?userId=debug_user_123"

echo "Sending mock callback to: $AUTH_URL"

curl -X POST "$AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task_123",
    "status": "SUCCESS",
    "clips": [
        {
            "id": "clip_debug_001",
            "title": "Debug Song",
            "audio_url": "https://cdn1.suno.ai/debug.mp3",
            "image_url": "https://cdn1.suno.ai/image.png",
            "model_name": "v3.5",
            "status": "streaming"
        }
    ]
}'

echo -e "\nDone."
