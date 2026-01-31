# RRAASI Dance Meditation Agent

AI-powered meditation guide that leads users through transformative dance meditation sessions.

## Features

- 🎙️ **Voice-guided meditation** via LiveKit
- 🎵 **Smart music selection** from RRAASI Music library
- 🎨 **Dynamic music generation** for unique intentions
- 🧘 **Step-by-step guidance** through meditation phases
- 🖼️ **Visual postures** via Gemini (TODO)
- 💾 **Session tracking** in Firestore

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment:**
Create `.env.local`:
```bash
# LiveKit credentials
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./rraasiServiceAccount.json
FIREBASE_PROJECT_ID=rraasi-8a619

# OpenAI for LLM
OPENAI_API_KEY=your_openai_key
```

3. **Run the agent:**
```bash
python meditation_agent.py dev
```

## Session Flow

1. **Welcome & Intention** (2 min)
   - Greet user warmly
   - Assess current mood
   - Guide intention setting

2. **Music Selection** (1 min)
   - Query Firestore for matching tracks
   - OR generate new music if needed
   - Build progressive playlist

3. **Guided Meditation** (25-30 min)
   - Grounding (2-3 min)
   - Awakening (3-5 min)
   - Heart Opening (5 min)
   - Free Dance (15-20 min)
   - Cool-down (3-5 min)
   - Stillness (2-3 min)

4. **Completion**
   - Save session to Firestore
   - Thank user

## Firestore Integration

The agent has direct access to:
- `music_tracks` - Query and select meditation music
- `meditation_sessions` - Save completed sessions

## TODO

- [ ] Implement LiveKit TTS/STT
- [ ] Add Gemini image generation for postures
- [ ] Implement music generation API call
- [ ] Add mood detection from voice tone
- [ ] Implement group session support
- [ ] Add session rating/feedback

## Testing

```bash
# Test with mock responses
python meditation_agent.py dev --test-mode
```

## Architecture

```
meditation_agent.py
├── DanceMeditationAgent (main class)
│   ├── start_session() - Entry point
│   ├── welcome_and_assess() - Intention setting
│   ├── select_music() - Music selection/generation
│   ├── guide_meditation() - Full meditation flow
│   └── save_session() - Persist to Firestore
│
└── Helper Methods
    ├── query_music_tracks() - Firestore queries
    ├── generate_meditation_music() - Music gen API
    ├── speak() / listen() - Voice I/O
    └── show_posture_image() - Visual guidance
```
