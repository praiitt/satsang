# Live Test Log - Local Instance

## Test Date & Time

November 2, 2025 - 12:23 IST

## Setup Status

### ✅ Frontend

- **Port**: 3003 (3000 was in use)
- **URL**: http://localhost:3003
- **Status**: Running and connected
- **Connection**: Connected to LiveKit Cloud (India South)

### ✅ Agent

- **Status**: Running (PID: 1959)
- **Connection**: Connected to LiveKit Cloud
- **Location**: `/Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python`

## Conversation Test

### Agent Greeting (Observed)

✅ Agent sent greeting: **"नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं?"**

- **Status**: Perfect Devanagari Hindi
- **Display**: Showing correctly in chat transcript
- **Timing**: Greeting appeared immediately after connection

## STT Configuration Check

### Environment Variables

- `STT_MODEL`: Set to `sarvam` in `.env.local`
- `SARVAM_API_KEY`: Set to `test_key` in `.env.local`

### Sarvam Plugin Status

- **Plugin Installation**: CHECKING...
- **Expected Behavior**:
  - If plugin NOT installed → Falls back to AssemblyAI
  - If plugin installed → Uses Sarvam STT

## Next Steps for Testing

1. **Monitor agent logs** for STT model selection
2. **Test Hindi speech** to see transcription accuracy
3. **Check if Sarvam is actually being used** or falling back to AssemblyAI
4. **Compare transcription quality** based on which model is active

## Observations

1. Agent greeting works perfectly ✅
2. Connection established successfully ✅
3. Chat transcript visible and working ✅
4. STT model selection needs verification (checking logs...)

## To Monitor Logs

Check agent output for:

- "Using STT model: ..."
- "Using Sarvam STT - BEST for Hindi/Indian languages!"
- OR "Sarvam plugin not installed. Falling back to AssemblyAI"
- OR "Using Deepgram Nova-2..."
- OR "Using AssemblyAI..."
