# Test script for Meditation Agent

Test the meditation agent's Firestore connectivity and guidance scripts.

## Prerequisites

```bash
# Install dependencies
pip install google-cloud-firestore google-generativeai

# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS=./rraasiServiceAccount.json
export GEMINI_API_KEY=your_gemini_key
```

## Test 1: Firestore Connectivity

```bash
python -c "
from google.cloud import firestore
db = firestore.Client(project='rraasi-8a619')
tracks = db.collection('music_tracks').where('status', '==', 'COMPLETED').limit(5).stream()
for doc in tracks:
    print(f'✅ {doc.to_dict()[\"title\"]}')
"
```

## Test 2: Meditation Guidance

```python
from meditation_guidance import MeditationGuidance

# Test English guidance
guide = MeditationGuidance.get_guidance("grounding", "en")
print("Grounding (English):")
print(guide["intro"])
print(guide["breathing"])

# Test Hindi guidance
guide_hi = MeditationGuidance.get_guidance("grounding", "hi")
print("\nGrounding (Hindi):")
print(guide_hi["intro"])
print(guide_hi["breathing"])

# Test free dance cues
for i in range(3):
    cue = MeditationGuidance.get_free_dance_cue(i, "en")
    print(f"\nFree Dance Cue {i+1}: {cue}")
```

## Test 3: Session Saving

```python
from meditation_agent import DanceMeditationAgent
import asyncio

async def test_session_save():
    agent = DanceMeditationAgent(user_id="test_user_123", language="en")
    agent.state.intention = "Peace and clarity"
    agent.state.mood = "peaceful"
    agent.state.session_start = asyncio.get_event_loop().time()
    
    # Wait a few seconds
    await asyncio.sleep(5)
    
    # Save session
    await agent._save_session()
    print("✅ Session saved!")

asyncio.run(test_session_save())
```

## Test 4: Music Query

```python
from meditation_agent import DanceMeditationAgent
from livekit.agents import RunContext
import asyncio

async def test_music_query():
    agent = DanceMeditationAgent(user_id="test_user", language="en")
    
    # Mock RunContext
    class MockContext:
        pass
    
    context = MockContext()
    
    # Query meditation music
    result = await agent.query_meditation_music(
        context=context,
        mood="peaceful",
        bpm_preference="medium"
    )
    
    print("Music Query Result:")
    print(result)

asyncio.run(test_music_query())
```

## Expected Output

```
✅ Om Namah Shivaya
✅ Shanti Mantra Meditation
✅ Divine Calm
✅ Heart Awakening
✅ Serene Resonance

Grounding (English):
Stand comfortably, feet hip-width apart. Feel the earth beneath you...

Grounding (Hindi):
आराम से खड़े हो जाएं, पैर कंधे की चौड़ाई पर...

Free Dance Cue 1: Let go completely. Be the music. Trust your body.
Free Dance Cue 2: Thoughts will come - let them pass like clouds...

✅ Session saved!

Music Query Result:
I found 5 suitable tracks:
1. Om Namah Shivaya
2. Shanti Swar
3. Divine Calm
...
```

## Running the Agent

```bash
# Development mode
python meditation_agent.py dev

# Production mode
python meditation_agent.py start
```

## Troubleshooting

**Firebase Connection Error:**
- Check GOOGLE_APPLICATION_CREDENTIALS path
- Verify service account has Firestore access

**No Music Found:**
- Ensure music_tracks collection has documents
- Check status field is 'COMPLETED'
- Verify tags array exists

**Language Not Detected:**
- Check participant metadata has 'language' field
- Verify language codes: 'hi', 'en', 'hindi', 'english'
