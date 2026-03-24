#!/bin/bash
set -e

INPUT_FILE="$1"
BG_IMAGE="$2"

if [ -z "$INPUT_FILE" ]; then
    echo "Usage: ./generate_aura_video.sh <input.mp3_or_mp4> [optional_background.jpg_or_png]"
    echo "Example w/o BG: ./generate_aura_video.sh session_audio.mp3"
    echo "Example w/ BG:  ./generate_aura_video.sh session_audio.mp3 public/images/gurus/ramakrishna.jpg"
    exit 1
fi

FILENAME=$(basename -- "$INPUT_FILE")
EXTENSION="${FILENAME##*.}"
BASENAME="${FILENAME%.*}"

AUDIO_OUTPUT="temp_audio_$BASENAME.mp3"
SRT_OUTPUT="temp_subs_$BASENAME.srt"
FINAL_OUTPUT="${BASENAME}_final_aura.mp4"

# Load OpenAI Key safely
OPENAI_API_KEY=$(cat livekit_server/agent-starter-python/.env.local | grep OPENAI_API_KEY | cut -d '=' -f 2- | tr -d '"' | tr -d ' ')

if [ -z "$OPENAI_API_KEY" ]; then
    echo "CRITICAL: Could not find OPENAI_API_KEY in livekit_server/agent-starter-python/.env.local."
    exit 1
fi

echo "🎬 Step 1: Standardizing Audio payload for AI Transcription..."
ffmpeg -i "$INPUT_FILE" -vn -c:a libmp3lame -b:a 128k -y "$AUDIO_OUTPUT" > /dev/null 2>&1

echo "🧠 Step 2: Uploading to OpenAI Whisper AI for hyper-accurate subtitle mapping..."
curl -s --request POST \
  --url https://api.openai.com/v1/audio/transcriptions \
  --header "Authorization: Bearer $OPENAI_API_KEY" \
  --header "Content-Type: multipart/form-data" \
  --form file="@$AUDIO_OUTPUT" \
  --form model="whisper-1" \
  --form response_format="srt" \
  > "$SRT_OUTPUT"

# Quick verification
if ! head -n 1 "$SRT_OUTPUT" | grep -q "1"; then
    echo "❌ AI Transcription failed. Output:"
    cat "$SRT_OUTPUT"
    exit 1
fi

echo "🌌 Step 3: Rendering Complex Visuals & Buring Subtitles simultaneously..."

# Dynamic Filter Logic based on an optional Background Image
if [ -n "$BG_IMAGE" ]; then
    echo "🖼️  Background Image detected! Compositing aura over image..."
    # Background image is [0:v], audio input is [1:a]
    INPUT_ARGS="-loop 1 -framerate 25 -i \"$BG_IMAGE\" -i \"$INPUT_FILE\""
    AUDIO_FILTER_INPUT="[1:a]"
    AUDIO_MAP="1:a"
    SHORTEST="-shortest"
    
    # We heavily dim/blur the background portrait image so the glowing aura and subtitles pop!
    # Force rgb24 so the blend logic handles color chemically correct without turning YUV planes pink!
    bg_filter="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,eq=brightness=-0.3:saturation=0.7,gblur=sigma=10,format=rgb24[bg_sized]; [bg_sized][v_aura]blend=all_mode=screen:all_opacity=0.9[v_composed]; [v_composed]"
else
    echo "🌑 No Background Image parameter passed. Operating strictly in Pitch-Black Mode..."
    INPUT_ARGS="-i \"$INPUT_FILE\""
    AUDIO_FILTER_INPUT="[0:a]"
    AUDIO_MAP="0:a"
    SHORTEST=""
    
    bg_filter="[v_aura]"
fi

# The Master Filter Graph String
FILTER_COMPLEX="\
${AUDIO_FILTER_INPUT}aformat=channel_layouts=stereo,adelay=delays=0|300S:all=1[a_phased_pre];\
[a_phased_pre]asplit=2[a_phased1][a_phased2];\
[a_phased1]avectorscope=s=1080x1920:zoom=1.3:rc=255:gc=120:bc=20:draw=line,format=rgb24[v_base];\
[v_base]gblur=sigma=40[glow];\
[a_phased2]avectorscope=s=1080x1920:zoom=1.3:rc=255:gc=220:bc=150:draw=line,format=rgb24[v_core];\
[glow][v_core]blend=all_mode=addition[v_aura];\
${bg_filter}subtitles=$SRT_OUTPUT:force_style='Fontname=Oswald,Fontsize=16,PrimaryColour=&H0000FFFF,BackColour=&H80000000,BorderStyle=1,Outline=2,Shadow=2,Alignment=2,MarginV=120,Bold=1'[v_final]\
"

# Example: LIMIT="-t 45" to just render 45 seconds
LIMIT="-t 30"

# Execute immense rendering operation flawlessly
eval "ffmpeg $INPUT_ARGS -filter_complex \"$FILTER_COMPLEX\" -map \"[v_final]\" -map $AUDIO_MAP -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p $SHORTEST -c:a aac -b:a 128k -y $LIMIT \"$FINAL_OUTPUT\""

echo "✅ Success! Cleaning up temp payload files..."
rm "$AUDIO_OUTPUT" "$SRT_OUTPUT"

echo "🎉 Done! Your Masterpiece Aura Video with AI Captions is ready at: $FINAL_OUTPUT"
