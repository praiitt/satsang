# Improving Hindi STT Accuracy (Romanized Output)

## Problem

You're speaking in Hindi, but the STT (Speech-to-Text) is not accurately converting your speech to Romanized Hindi text. This affects the agent's understanding.

## Solutions

### Option 1: Try Deepgram Nova-2 (Recommended)

Deepgram Nova-2 typically provides better accuracy for Hindi speech recognition.

**Steps:**

1. Add to `.env.local`:

   ```bash
   STT_MODEL=deepgram/nova-2
   ```

2. If Deepgram requires an API key (check LiveKit docs), add:

   ```bash
   DEEPGRAM_API_KEY=your_api_key_here
   ```

3. Restart the agent:
   ```bash
   pm2 restart satsang-livekit-agent
   ```

### Option 2: Keep AssemblyAI but Improve Agent Instructions

The agent's instructions have been updated to better handle Romanized Hindi variations:

- Understands common spelling variations ("kaise", "kese", "kaisey")
- Recognizes Hindi words in English alphabet
- Interprets STT errors intelligently

This helps even if STT accuracy is imperfect.

### Option 3: Try Google Cloud Speech-to-Text

If you have Google Cloud credentials:

1. Set up Google Cloud credentials
2. Add to `.env.local`:

   ```bash
   STT_MODEL=google/cloud
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
   ```

3. Restart the agent

### Testing Different Models

1. Test with current model (AssemblyAI):

   ```bash
   # Remove or comment STT_MODEL from .env.local
   pm2 restart satsang-livekit-agent
   ```

2. Test with Deepgram:

   ```bash
   # Add STT_MODEL=deepgram/nova-2 to .env.local
   pm2 restart satsang-livekit-agent
   ```

3. Check logs to see which model is being used:
   ```bash
   pm2 logs satsang-livekit-agent | grep "STT model"
   ```

### What Changed in Agent Instructions

The agent now explicitly understands:

- Romanized Hindi input patterns
- Common variations and STT errors
- How to interpret Hindi words written in English letters

This helps the agent understand your speech even if STT makes minor errors.

## Current Configuration

- **Default**: `assemblyai/universal-streaming`
- **Language**: `hi` (Hindi)
- **Agent Instructions**: Updated to handle Romanized Hindi intelligently

## Next Steps

1. Try Deepgram first (often best accuracy): `STT_MODEL=deepgram/nova-2`
2. Monitor accuracy in conversations
3. If Deepgram doesn't improve accuracy, the updated agent instructions should help compensate
