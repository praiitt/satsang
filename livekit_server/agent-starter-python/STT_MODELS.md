# STT Model Options for Hindi Devanagari Script

## Current Situation

You want Hindi speech input to appear in **Devanagari script** (नमस्ते) in the chat transcript, not Romanized (namaste).

## Available STT Models in LiveKit

### Option 1: Deepgram Nova-2 (Recommended to Try)
```python
stt=inference.STT(model="deepgram/nova-2", language="hi")
```
- **Pros**: May support Hindi Devanagari script output, supports streaming
- **Cons**: May require Deepgram API key, needs testing
- **Status**: Currently configured - test and verify if it outputs Devanagari

### Option 2: AssemblyAI Universal Streaming (Current Fallback)
```python
stt=inference.STT(model="assemblyai/universal-streaming", language="hi")
```
- **Pros**: Streaming works perfectly, transcripts show in chat
- **Cons**: Outputs Romanized Hindi (namaste instead of नमस्ते)
- **Note**: LLM understands Romanized Hindi well, agent responds in Devanagari

### Option 3: OpenAI Whisper Large v3
```python
stt=inference.STT(model="openai/whisper-large-v3", language="hi")
```
- **Pros**: Outputs proper Devanagari script (नमस्ते)
- **Cons**: Does NOT support real-time streaming - transcripts won't appear in chat
- **Status**: Not suitable if you need to see your speech in real-time

### Option 4: Google Cloud Speech-to-Text
May be available through LiveKit if you configure Google Cloud credentials.
- **Pros**: Excellent Hindi Devanagari support, streaming available
- **Cons**: Requires Google Cloud API key setup, may have additional costs

## Testing Approach

1. **Test Deepgram first** (current configuration)
   - If it works: You'll get Devanagari output + streaming
   - If it fails: Check server logs for error

2. **Fallback to AssemblyAI** if Deepgram doesn't work
   - You'll see your speech in chat (Romanized)
   - Agent understands and responds in proper Hindi Devanagari

3. **Consider Frontend Solution** (Alternative)
   - Use a transliteration library in the frontend to convert Romanized → Devanagari
   - Libraries: `indic-transliteration`, `transliteration`
   - This would convert "namaste" → "नमस्ते" in the UI display only

## Quick Test Commands

After restarting the agent, test which model works:

```bash
# Check agent logs
pm2 logs satsang-livekit-agent

# Look for STT-related errors or language support messages
```

## Recommendation

1. **First**: Test the current Deepgram configuration
2. **If Deepgram fails**: Revert to AssemblyAI (streaming works, just Romanized)
3. **Future**: Consider adding frontend transliteration for better UX

