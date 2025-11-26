# Language Support Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (User Interface)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │ Language Selector│                                                   │
│  │  ○ हिंदी (Hindi) │                                                   │
│  │  ○ English       │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌────────────────────────────────────────────┐                         │
│  │ Connect to LiveKit Room                    │                         │
│  │                                             │                         │
│  │ metadata = {                                │                         │
│  │   language: "en"  // or "hi"               │                         │
│  │ }                                           │                         │
│  └────────┬───────────────────────────────────┘                         │
│           │                                                              │
└───────────┼──────────────────────────────────────────────────────────────┘
            │
            │ Metadata sent via LiveKit connection
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LIVEKIT SERVER (Agent Backend)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Language Detection (entrypoint function)                       │  │
│  │                                                                    │  │
│  │    for participant in room.remote_participants:                   │  │
│  │        metadata = json.loads(participant.metadata)                │  │
│  │        user_language = metadata["language"]  # "hi" or "en"       │  │
│  │                                                                    │  │
│  │    Default: user_language = "hi"                                  │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│                                ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 2. Configure STT (Speech-to-Text)                                 │  │
│  │                                                                    │  │
│  │    if user_language == "hi":                                      │  │
│  │        stt = inference.STT(model="sarvam", language="hi")         │  │
│  │    else:                                                           │  │
│  │        stt = inference.STT(model="assemblyai", language="en")     │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│                                ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 3. Configure TTS (Text-to-Speech)                                 │  │
│  │                                                                    │  │
│  │    if user_language == "hi":                                      │  │
│  │        voice_id = GURUJI_TTS_VOICE_HI                             │  │
│  │    else:                                                           │  │
│  │        voice_id = GURUJI_TTS_VOICE_EN                             │  │
│  │                                                                    │  │
│  │    tts = inference.TTS(model="cartesia", voice=voice_id,          │  │
│  │                        language=user_language)                    │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│                                ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4. Configure Agent Instructions                                   │  │
│  │                                                                    │  │
│  │    language_block = f"""                                          │  │
│  │    LANGUAGE PREFERENCE (RUNTIME):                                 │  │
│  │    - User's language code is '{user_language}'                    │  │
│  │    - If 'en', respond ONLY in ENGLISH                             │  │
│  │    - If 'hi', respond in Hindi (Devanagari)                       │  │
│  │    """                                                             │  │
│  │                                                                    │  │
│  │    Agent(instructions=base_instructions + language_block)         │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│                                ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 5. Send Language-Appropriate Greeting                             │  │
│  │                                                                    │  │
│  │    if user_language == "hi":                                      │  │
│  │        greeting = "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं..."      │  │
│  │    else:                                                           │  │
│  │        greeting = "Namaste! I am your spiritual guru..."          │  │
│  │                                                                    │  │
│  │    await session.say(greeting)                                    │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
                                 │ Greeting spoken in selected language
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONVERSATION LOOP                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User speaks ──► STT (language-specific) ──► LLM (language-aware)       │
│                                                  │                       │
│                                                  ▼                       │
│                                    Response in selected language         │
│                                                  │                       │
│                                                  ▼                       │
│  User hears ◄── TTS (language-specific voice) ◄─┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


SUPPORTED AGENTS:
═════════════════

┌────────────────┬──────────────────────────────────────────────────────┐
│ Agent          │ Language Support                                     │
├────────────────┼──────────────────────────────────────────────────────┤
│ Guruji         │ ✅ Hindi: नमस्ते! मैं आपका आध्यात्मिक गुरु हूं...   │
│ (agent.py)     │ ✅ English: Namaste! I am your spiritual guru...     │
├────────────────┼──────────────────────────────────────────────────────┤
│ ET             │ ✅ Hindi: नमस्ते! मैं आपका ब्रह्मांडीय मार्गदर्शक... │
│ (etagent.py)   │ ✅ English: Greetings! I'm your guide to ET...       │
├────────────────┼──────────────────────────────────────────────────────┤
│ Osho           │ ✅ Hindi: नमस्ते! मैं ओशो हूं...                     │
│ (oshoagent.py) │ ✅ English: Hello! I am Osho...                      │
└────────────────┴──────────────────────────────────────────────────────┘


LANGUAGE METADATA FORMAT:
═════════════════════════

Frontend sends:
┌─────────────────────────────────────────┐
│ {                                        │
│   "language": "en"  // or "hi"          │
│ }                                        │
└─────────────────────────────────────────┘

Backend receives:
┌─────────────────────────────────────────┐
│ participant.metadata = '{"language":"en"}'│
│                                          │
│ Parsed as:                               │
│ user_language = "en"  // or "hi"        │
└─────────────────────────────────────────┘


DEFAULT BEHAVIOR:
═════════════════

If NO metadata is sent:
┌─────────────────────────────────────────┐
│ user_language = "hi"  (Hindi)           │
│                                          │
│ All agents default to Hindi mode        │
│ for backward compatibility              │
└─────────────────────────────────────────┘


ENVIRONMENT VARIABLES (Optional):
══════════════════════════════════

Agent-Specific Voices:
┌─────────────────────────────────────────┐
│ GURUJI_TTS_VOICE_HI=<voice_id>          │
│ GURUJI_TTS_VOICE_EN=<voice_id>          │
│                                          │
│ ET_TTS_VOICE_HI=<voice_id>              │
│ ET_TTS_VOICE_EN=<voice_id>              │
│                                          │
│ OSHO_TTS_VOICE_HI=<voice_id>            │
│ OSHO_TTS_VOICE_EN=<voice_id>            │
└─────────────────────────────────────────┘

Global Fallbacks:
┌─────────────────────────────────────────┐
│ TTS_VOICE_HI=<default_hindi_voice>      │
│ TTS_VOICE_EN=<default_english_voice>    │
│ TTS_VOICE_ID=<legacy_fallback>          │
└─────────────────────────────────────────┘

STT Configuration:
┌─────────────────────────────────────────┐
│ STT_MODEL=sarvam  # Best for Hindi      │
│ # or                                     │
│ STT_MODEL=deepgram/nova-2  # Good both  │
│ # or                                     │
│ STT_MODEL=assemblyai/universal-streaming│
└─────────────────────────────────────────┘
```
