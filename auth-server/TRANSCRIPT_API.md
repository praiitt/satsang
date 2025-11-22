# Audio Transcript API

This API endpoint transcribes audio files (MP3/OGG/WAV) from URLs using Whisper and formats them as conversations.

## Setup

### 1. Install Python Dependencies

```bash
cd auth-server/scripts
pip install -r requirements.txt
```

Or install directly:

```bash
pip install openai-whisper requests
```

### 2. Install FFmpeg (Required for Audio Processing)

**macOS:**

```bash
brew install ffmpeg
```

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 3. Verify Setup

```bash
python3 --version  # Should be Python 3.8+
ffmpeg -version    # Should show ffmpeg version
```

## API Endpoint

### POST `/transcript/audio`

Transcribe audio from URL using Whisper.

**Authentication:** Required (uses `requireAuth` middleware)

**Request Body:**

```json
{
  "audio_url": "https://storage.googleapis.com/bucket/audio.ogg",
  "chunk_duration": 300,
  "language": "hi",
  "async": false
}
```

**Parameters:**

- `audio_url` (required): URL of audio file (MP3/OGG/WAV/MP4)
- `chunk_duration` (optional, default: 300): Duration in seconds for chunking long audio files
- `language` (optional, default: "hi"): Language code for transcription (e.g., "hi" for Hindi, "en" for English)
- `async` (optional, default: false): If true, returns immediately and processes in background

**Response (Success):**

```json
{
  "success": true,
  "transcript": "Full transcript text...",
  "conversation": [
    {
      "speaker": "user",
      "text": "First sentence...",
      "timestamp": 0
    },
    {
      "speaker": "assistant",
      "text": "Response sentence...",
      "timestamp": 5
    }
  ],
  "duration": 120.5,
  "chunks_processed": 1,
  "character_count": 250,
  "language": "hi",
  "processed_at": "2024-01-01T12:00:00"
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "Error message"
}
```

**Async Response (when async=true):**

```json
{
  "success": true,
  "status": "processing",
  "message": "Audio transcript extraction started in background",
  "audio_url": "https://...",
  "estimated_time": "5-15 minutes depending on audio length"
}
```

## Usage Examples

### Synchronous Request (Wait for Result)

```bash
curl -X POST http://localhost:4000/transcript/audio \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "audio_url": "https://storage.googleapis.com/bucket/audio.ogg",
    "language": "hi"
  }'
```

### Asynchronous Request (Background Processing)

```bash
curl -X POST http://localhost:4000/transcript/audio \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "audio_url": "https://storage.googleapis.com/bucket/audio.ogg",
    "language": "hi",
    "async": true
  }'
```

## How It Works

1. **Download**: Downloads audio file from URL
2. **Convert**: Converts to WAV format (if needed) using FFmpeg
3. **Chunk**: Splits long audio into chunks (if duration > chunk_duration)
4. **Transcribe**: Uses Whisper to transcribe each chunk
5. **Format**: Formats transcript as conversation with alternating user/assistant turns
6. **Save** (optional): Saves to Firestore if async mode and userId is available

## Supported Formats

- MP3
- OGG (Opus)
- WAV
- MP4 (audio track extracted)

## Language Support

Whisper supports many languages. Common codes:

- `hi` - Hindi
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German

See [Whisper documentation](https://github.com/openai/whisper) for full list.

## Performance

- **Small files (< 5 minutes)**: 30-60 seconds
- **Medium files (5-15 minutes)**: 2-5 minutes
- **Large files (> 15 minutes)**: 5-15 minutes (chunked processing)

Processing time depends on:

- Audio duration
- Hardware (CPU/GPU)
- Whisper model size (currently using "base" model)

## Troubleshooting

### Error: "Python 3 not found"

Install Python 3.8+ and ensure `python3` is in PATH.

### Error: "Transcription script not found"

Ensure `auth-server/scripts/transcribe_audio.py` exists and is executable.

### Error: "FFmpeg not found"

Install FFmpeg (see Setup step 2).

### Error: "Whisper not installed"

Install Whisper: `pip install openai-whisper`

### Slow Processing

- Use async mode for long files
- Consider using GPU-accelerated Whisper (requires CUDA)
- Reduce chunk_duration for faster processing

## Future Improvements

- [ ] Speaker diarization for accurate user/assistant separation
- [ ] GPU acceleration support
- [ ] Support for more Whisper models (base, small, medium, large)
- [ ] Webhook notifications when async processing completes
- [ ] Transcription cache to avoid re-processing same URLs
