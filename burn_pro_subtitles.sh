#!/bin/bash
set -e

# Config
VIDEO_INPUT=$1
if [ -z "$VIDEO_INPUT" ]; then
    echo "Usage: ./burn_pro_subtitles.sh <input_video.mp4>"
    exit 1
fi
VIDEO_NAME=$(basename "$VIDEO_INPUT" .mp4)
AUDIO_OUTPUT="temp_audio_$VIDEO_NAME.mp3"
SRT_OUTPUT="temp_subs_$VIDEO_NAME.srt"
FINAL_OUTPUT="${VIDEO_NAME}_pro_captioned.mp4"

# Load OpenAI Key safely from the backend environemnt
OPENAI_API_KEY=$(grep OPENAI_API_KEY livekit_server/agent-starter-python/.env.local | cut -d '=' -f 2- | tr -d '"')

if [ -z "$OPENAI_API_KEY" ]; then
    echo "CRITICAL: Could not find OPENAI_API_KEY in livekit_server/agent-starter-python/.env.local."
    exit 1
fi

echo "🎬 Step 1: Extracting optimized MP3 audio payload for AI Transcription..."
ffmpeg -i "$VIDEO_INPUT" -vn -c:a libmp3lame -b:a 128k -y "$AUDIO_OUTPUT" > /dev/null 2>&1

echo "🧠 Step 2: Uploading to OpenAI Whisper AI for hyper-accurate subtitle mapping..."
# We explicitly request 'srt' format. We use standard Hindi/English mixed detect or whisper default.
curl -s --request POST \
  --url https://api.openai.com/v1/audio/transcriptions \
  --header "Authorization: Bearer $OPENAI_API_KEY" \
  --header "Content-Type: multipart/form-data" \
  --form file="@$AUDIO_OUTPUT" \
  --form model="whisper-1" \
  --form response_format="srt" \
  > "$SRT_OUTPUT"

if ! grep -q "1" "$SRT_OUTPUT"; then
    echo "❌ AI Transcription failed. Output:"
    cat "$SRT_OUTPUT"
    exit 1
fi

echo "🔥 Step 3: Burning engaging AI Subtitles perfectly onto the Aura..."
# Engaging Style parameters: Bright Yellow (&H0000FFFF), Huge Bold Arial, Thick Black Core Shadow/Outline, Aligned Bottom-Center.
# Outline=3 adds thick border. Alignment=2 is bottom center. MarginV=40 pushes it slightly up from bottom.
ffmpeg -i "$VIDEO_INPUT" -vf "subtitles=$SRT_OUTPUT:force_style='Fontname=Arial,Fontsize=30,PrimaryColour=&H0000FFFF,BackColour=&H80000000,BorderStyle=1,Outline=3,Shadow=3,Alignment=2,MarginV=45,Bold=1'" -c:a copy -c:v libx264 -preset fast -crf 22 -y "$FINAL_OUTPUT" > /dev/null 2>&1

echo "✅ Success! Cleaning up temp payload files..."
rm "$AUDIO_OUTPUT" "$SRT_OUTPUT"

echo "🎉 Done! Your aggressively stylized, professional subbed video is ready at: $FINAL_OUTPUT"
