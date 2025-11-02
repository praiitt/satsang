# Local Testing Results - STT Model Status

## Test Date
November 1, 2025

## Current Status

### ✅ Frontend
- **Status**: Running successfully on `http://localhost:3000`
- **Connection**: Connected to LiveKit Cloud (India South region)
- **UI**: Working properly, can start sessions

### ✅ Agent
- **Status**: Running successfully
- **Connection**: Connected to LiveKit Cloud
- **Process**: Multiple agent processes running

### ❌ Sarvam STT
- **Status**: **NOT WORKING - Plugin Not Installed**
- **Issue**: The `livekit-agents[sarvam]` plugin is not installed
- **Current Behavior**: When `STT_MODEL=sarvam` is set, it will:
  1. Try to import Sarvam plugin
  2. Fail with `ImportError`
  3. Fall back to AssemblyAI
  4. Log warning: "Sarvam plugin not installed"

### ⚠️ Current STT Model
- **Model**: `assemblyai/universal-streaming` (default)
- **Language**: Hindi (`hi`)
- **Reason**: Sarvam not installed, so using fallback

## How to Fix Sarvam

### Option 1: Install Sarvam Plugin
```bash
cd ~/satsang/livekit_server/agent-starter-python
uv pip install "livekit-agents[sarvam]~=1.2"
```

Then restart the agent and it should use Sarvam.

### Option 2: Try Deepgram Instead
Deepgram doesn't require a plugin installation, just set:
```bash
# In .env.local:
STT_MODEL=deepgram/nova-2
```

## Environment Variables Check

Currently in `.env.local`:
- ✅ `LIVEKIT_URL` - Set
- ✅ `LIVEKIT_API_KEY` - Set  
- ✅ `LIVEKIT_API_SECRET` - Set
- ✅ `TTS_VOICE_ID` - Set (optional)
- ✅ `TTS_SPEED` - Set to `slow`
- ✅ `STT_MODEL` - Set to `sarvam` (but plugin not installed)
- ⚠️ `SARVAM_API_KEY` - Set to `test_key` (needs real key)

## Recommendations

1. **For immediate testing**: 
   - Remove `STT_MODEL=sarvam` from `.env.local` OR
   - Install Sarvam plugin: `uv pip install "livekit-agents[sarvam]~=1.2"`

2. **For better Hindi accuracy**:
   - Install Sarvam plugin AND get real API key from https://sarvam.ai/
   - OR try Deepgram: `STT_MODEL=deepgram/nova-2`

3. **Current behavior**:
   - Agent is using AssemblyAI (default fallback)
   - This explains poor Hindi recognition
   - AssemblyAI is not optimized for Hindi/Indian accents

## Next Steps

1. Install Sarvam plugin if you want to use it
2. Get real Sarvam API key from https://sarvam.ai/
3. Test Deepgram as alternative: `STT_MODEL=deepgram/nova-2`
4. Monitor agent logs to see which STT model is actually being used

## Agent Log Location

Check agent logs for STT model selection:
- Look for: "Using STT model: ..."
- Look for: "Using Sarvam STT" OR "Sarvam plugin not installed"
- Look for: "Using Deepgram Nova-2" OR "Using AssemblyAI"

