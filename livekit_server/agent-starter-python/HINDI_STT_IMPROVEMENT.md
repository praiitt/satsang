# Improving Hindi STT Accuracy - Step by Step Guide

## Current Problem

Your Hindi speech is not being accurately converted to Romanized English text. The transcription you see is not matching what you're saying.

## Immediate Solution: Try Deepgram (Recommended)

**Deepgram Nova-2 typically provides MUCH better Hindi recognition than AssemblyAI.**

### Quick Setup:

1. **Edit `.env.local` file**:
   ```bash
   cd ~/satsang/livekit_server/agent-starter-python
   nano .env.local
   ```

2. **Add this line**:
   ```bash
   STT_MODEL=deepgram/nova-2
   ```

3. **Save and restart**:
   ```bash
   pm2 restart satsang-livekit-agent
   ```

4. **Check logs to confirm**:
   ```bash
   pm2 logs satsang-livekit-agent | grep "STT model"
   ```
   You should see: "Using Deepgram Nova-2 for improved Hindi STT accuracy"

### Why Deepgram?

- Better trained on Hindi speech
- Handles Indian accents better
- More accurate Romanized output
- Still supports real-time streaming

## Alternative: Google Cloud Speech-to-Text

If Deepgram doesn't work or you want even better accuracy:

### Setup Google Cloud:

1. **Create Google Cloud account** (if needed)
2. **Enable Speech-to-Text API**
3. **Download service account credentials JSON**
4. **Add to `.env.local`**:
   ```bash
   STT_MODEL=google/cloud
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json
   ```

5. **Restart agent**

Google Cloud has excellent Hindi support but requires more setup.

## Audio Quality Tips

These help regardless of which STT model you use:

1. **Speak clearly and at moderate pace**
   - Don't speak too fast
   - Pronounce words distinctly

2. **Use a good microphone**
   - Built-in mics are OK but external mics work better
   - Reduce background noise

3. **Check your browser audio settings**
   - Make sure the correct microphone is selected
   - Adjust input volume if needed

4. **Ensure good internet connection**
   - STT requires sending audio to the server
   - Slow connection can affect accuracy

## Testing

After changing STT model:

1. **Restart the agent**:
   ```bash
   pm2 restart satsang-livekit-agent
   ```

2. **Test with common Hindi phrases**:
   - "namaste" should transcribe correctly
   - "aap kaise hain" should be recognizable
   - "dharma kya hai" should work

3. **Compare accuracy**:
   - Try saying the same phrases
   - Check if Deepgram produces better results than AssemblyAI

## Troubleshooting

### Deepgram not working?

1. Check if LiveKit Cloud supports Deepgram (it should)
2. Check logs for errors:
   ```bash
   pm2 logs satsang-livekit-agent
   ```

3. If Deepgram requires an API key:
   ```bash
   # Add to .env.local
   DEEPGRAM_API_KEY=your_key_here
   ```

### Still not accurate enough?

1. Try Google Cloud Speech-to-Text (best accuracy, requires setup)
2. Improve audio quality (better mic, quieter environment)
3. Speak more clearly and slowly
4. Check if your accent/dialect is well-supported

## Expected Results

After switching to Deepgram, you should see:
- ✅ Better recognition of Hindi words
- ✅ More accurate Romanized text
- ✅ Fewer transcription errors
- ✅ Better understanding by the agent

## Next Steps

1. **Try Deepgram first** (easiest, usually best results)
2. **Test and compare** with previous AssemblyAI results
3. **If needed**, consider Google Cloud for maximum accuracy

