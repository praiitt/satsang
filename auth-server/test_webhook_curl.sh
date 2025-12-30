
curl -X POST https://satsang-auth-server-6ougd45dya-el.a.run.app/suno/callback?userId=test_user_verification \
-H "Content-Type: application/json" \
-d '{
  "taskId": "test-task-id-123",
  "status": "SUCCESS",
  "clips": [
    {
      "id": "test-clip-id-123",
      "title": "Verification Track",
      "audio_url": "https://example.com/audio.mp3",
      "video_url": "https://example.com/video.mp4",
      "image_url": "https://example.com/image.png",
      "model_name": "chirp-v3",
      "created_at": "2024-01-01T00:00:00Z",
      "status": "streaming"
    }
  ]
}'
