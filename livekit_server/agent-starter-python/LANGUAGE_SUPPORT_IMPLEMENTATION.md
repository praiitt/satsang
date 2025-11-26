# Language Support Implementation Summary

## Overview
All three agents (Guruji, ET, and Osho) now fully support **bilingual operation** based on the `language` metadata sent from the frontend. They will speak and greet users in either **Hindi** or **English** depending on the user's preference.

## What Was Fixed

### Problem
- **Guruji agent** (`agent.py`) had hardcoded Hindi-only greetings
- ET and Osho agents already had language-based greetings, but Guruji was missing this feature

### Solution
Updated the Guruji agent's greeting section (lines 1254-1280 in `agent.py`) to:
- Check the `user_language` variable (detected from participant metadata)
- Provide Hindi greetings when `user_language == 'hi'`
- Provide English greetings when `user_language == 'en'`

## How It Works

### 1. Language Detection (Already Implemented)
All three agents detect the user's language preference from LiveKit participant metadata:

```python
# In entrypoint function (lines 545-574 in agent.py)
user_language = "hi"  # Default to Hindi
try:
    await asyncio.sleep(1.0)  # Wait for participants to connect
    for participant in ctx.room.remote_participants.values():
        if participant.metadata:
            metadata = json.loads(participant.metadata)
            if isinstance(metadata, dict) and "language" in metadata:
                user_language = metadata["language"]
                logger.info(f"📝 Detected language preference: {user_language}")
                break
except Exception as e:
    logger.warning(f"Could not read language preference, defaulting to Hindi")
```

### 2. Language-Based Instructions (Already Implemented)
The agent's system instructions include a language block that tells the LLM to respond in the appropriate language:

```python
language_block = f"""
LANGUAGE PREFERENCE (RUNTIME):
- The user's selected language code is '{user_language}'.
- If this code is 'en', you MUST respond ONLY in ENGLISH (Latin script), including greetings.
- If this code is 'hi', respond in Hindi (Devanagari script) as you normally would.
- If the user mixes Hindi and English, still prefer the selected language ('en' → English, 'hi' → Hindi).
- Do NOT switch back to Hindi when the user language is 'en' unless they explicitly ask you to reply in Hindi.
"""
```

### 3. Language-Based Greetings (NOW IMPLEMENTED FOR ALL AGENTS)

#### Guruji Agent (agent.py)
```python
if user_language == 'hi':
    if is_live_satsang:
        greeting = "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आज हम सभी साधकों के साथ सत्संग में हैं..."
    else:
        greeting = "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं?..."
else:
    if is_live_satsang:
        greeting = "Namaste! I am your spiritual guru. Today we are all together in this satsang..."
    else:
        greeting = "Namaste! I am your spiritual guru. How are you?..."
```

#### ET Agent (etagent.py) - Already Implemented ✅
```python
if user_language == 'hi':
    greeting = "नमस्ते! मैं आपका ब्रह्मांडीय मार्गदर्शक हूं..."
else:
    greeting = "Greetings! I'm your guide to extraterrestrial civilizations..."
```

#### Osho Agent (oshoagent.py) - Already Implemented ✅
```python
if user_language == 'hi':
    greeting = "नमस्ते! मैं ओशो हूं - आपका आध्यात्मिक मार्गदर्शक..."
else:
    greeting = "Hello! I am Osho - your spiritual guide..."
```

### 4. Language-Based TTS Voice Selection (Already Implemented)
Each agent selects the appropriate TTS voice based on language:

```python
def _select_tts_voice_for_guruji(lang: str) -> str:
    if lang == "hi":
        specific = os.getenv("GURUJI_TTS_VOICE_HI")
        global_lang = os.getenv("TTS_VOICE_HI")
    else:
        specific = os.getenv("GURUJI_TTS_VOICE_EN")
        global_lang = os.getenv("TTS_VOICE_EN")
    
    if specific:
        return specific
    if global_lang:
        return global_lang
    
    # Fallback to legacy or default
    return os.getenv("TTS_VOICE_ID", "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc")
```

### 5. Language-Based STT Configuration (Already Implemented)
STT is configured based on the detected language:

```python
if user_language == "hi":
    # Use Sarvam/Deepgram for Hindi
    stt = inference.STT(model=stt_model, language="hi")
else:
    # Use AssemblyAI/Deepgram for English
    stt = inference.STT(model=stt_model, language="en")
```

## Frontend Integration

The frontend should send the language preference in the participant metadata when connecting:

```javascript
// Example frontend code
const metadata = JSON.stringify({
  language: "en"  // or "hi"
});

await room.connect(url, token, {
  metadata: metadata
});
```

## Environment Variables

For optimal language support, configure these environment variables:

### Agent-Specific TTS Voices
```bash
# Guruji Agent
GURUJI_TTS_VOICE_HI=<cartesia_voice_id_for_hindi>
GURUJI_TTS_VOICE_EN=<cartesia_voice_id_for_english>

# ET Agent
ET_TTS_VOICE_HI=<cartesia_voice_id_for_hindi>
ET_TTS_VOICE_EN=<cartesia_voice_id_for_english>

# Osho Agent
OSHO_TTS_VOICE_HI=<cartesia_voice_id_for_hindi>
OSHO_TTS_VOICE_EN=<cartesia_voice_id_for_english>
```

### Global Fallback Voices
```bash
TTS_VOICE_HI=<default_hindi_voice>
TTS_VOICE_EN=<default_english_voice>
TTS_VOICE_ID=<legacy_fallback_voice>
```

### STT Configuration
```bash
STT_MODEL=sarvam  # Best for Hindi
# or
STT_MODEL=deepgram/nova-2  # Good for both
# or
STT_MODEL=assemblyai/universal-streaming  # Default fallback
```

## Testing

To test the language support:

1. **Test Hindi Mode:**
   - Set frontend metadata: `{ "language": "hi" }`
   - Expected: Hindi greeting, Hindi responses, Hindi TTS voice

2. **Test English Mode:**
   - Set frontend metadata: `{ "language": "en" }`
   - Expected: English greeting, English responses, English TTS voice

3. **Test Default (No Metadata):**
   - Don't send language metadata
   - Expected: Defaults to Hindi for all agents

## Files Modified

- `/Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python/src/agent.py`
  - Lines 1254-1280: Added language-based greetings for Guruji agent

## Status

✅ **All agents now support bilingual operation:**
- ✅ Guruji Agent (agent.py) - Fixed
- ✅ ET Agent (etagent.py) - Already working
- ✅ Osho Agent (oshoagent.py) - Already working

All agents will:
- Detect language from participant metadata
- Greet users in their preferred language
- Respond in their preferred language throughout the conversation
- Use appropriate TTS voices for each language
- Use appropriate STT models for each language
