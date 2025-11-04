# Current STT Status - Live Test

## Configuration Found

### Environment Variables

- **STT_MODEL**: `deepgram/nova-2` ✅ (Currently set to Deepgram)
- **SARVAM_API_KEY**: Set (but not used since using Deepgram)

### Sarvam Plugin

- **Status**: NOT INSTALLED ❌
- **Impact**: Even if STT_MODEL=sarvam was set, it would fall back to AssemblyAI

## Current STT Model: Deepgram Nova-2

### Status

- **Model**: Deepgram Nova-2
- **Language**: Hindi (`hi`)
- **Expected**: Better accuracy than AssemblyAI for Hindi

### To Verify It's Being Used

Check agent logs for:

```
"Using Deepgram Nova-2 for improved Hindi STT accuracy"
```

## Test Results

### ✅ What's Working

1. Frontend running on port 3003
2. Agent connected to LiveKit Cloud
3. Agent greeting works: "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं?"
4. Chat transcript visible and working
5. Connection established successfully

### ⏳ Testing Needed

1. **Hindi speech recognition**: Test if Deepgram transcribes Hindi better
2. **Check agent logs**: Verify Deepgram is actually being used
3. **Compare accuracy**: Before (AssemblyAI) vs Now (Deepgram)

## Next Steps

1. **Test Hindi speech** - Speak in Hindi and check transcription in chat
2. **Monitor agent logs** - Look for "Using Deepgram Nova-2" confirmation
3. **Compare accuracy** - See if Deepgram gives better Hindi recognition

## If Deepgram Works Better

Great! Keep using `STT_MODEL=deepgram/nova-2`

## If Still Poor Accuracy

Options:

1. Try installing Sarvam plugin: `uv pip install "livekit-agents[sarvam]~=1.2"`
2. Get real Sarvam API key from https://sarvam.ai/
3. Set `STT_MODEL=sarvam` and restart

## Notes

- Agent may need restart to pick up new STT_MODEL
- Current agent process running with previous config
- Check logs to confirm which model is actually being used
