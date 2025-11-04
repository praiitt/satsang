# Bhajan Playback Feature - Implementation Plan

## Overview

Add ability for the Guruji agent to play devotional bhajans (songs) in the LiveKit room when users request them.

## Problem Analysis

### YouTube Music API Reality Check

❌ **YouTube Music does NOT provide a public API** for:

- Downloading audio files
- Streaming music directly
- Accessing MP3 files

❌ **YouTube Data API v3** can:

- ✅ Search for videos
- ✅ Get video metadata
- ❌ Cannot download or extract audio (violates YouTube Terms of Service)

⚠️ **Legal Issues**:

- Downloading/streaming YouTube content without permission violates ToS
- Could result in API key revocation or legal action
- Not suitable for production use

## Recommended Solutions

### Option 1: Spotify API (Recommended) ⭐

**Pros:**

- ✅ Official API with legal streaming
- ✅ Large bhajan collection
- ✅ High quality audio
- ✅ Free tier available

**Cons:**

- ⚠️ Requires user authentication (can use app-only auth for public playlists)
- ⚠️ 30-second previews on free tier (Premium needed for full tracks)

**Implementation:**

- Use Spotify Web API
- Create curated bhajan playlists
- Use `spotipy` Python library
- Stream preview or full track based on plan

### Option 2: Pre-downloaded Bhajan Library

**Pros:**

- ✅ No API limits
- ✅ No legal issues (if properly licensed)
- ✅ Instant playback
- ✅ Works offline

**Cons:**

- ⚠️ Requires storage space
- ⚠️ Limited to pre-downloaded songs
- ⚠️ Need to maintain library manually

**Implementation:**

- Store bhajans in `bhajans/` directory
- Use file-based search
- Support common formats (MP3, WAV, OGG)

### Option 3: Internet Archive / Free Music Sources

**Pros:**

- ✅ Many spiritual songs available
- ✅ Often public domain or Creative Commons
- ✅ No API key needed

**Cons:**

- ⚠️ Limited selection
- ⚠️ Variable quality
- ⚠️ Requires manual curation

### Option 4: Combined Approach (Best) 🌟

Use **multiple sources** in priority order:

1. **Local library** (fastest, most reliable)
2. **Spotify API** (for requests not in library)
3. **Fallback message** if not available

## Technical Implementation Plan

### Phase 1: Agent Function Tool Setup

#### 1.1 Add Function Tool Decorator

```python
from livekit.agents import function_tool, RunContext

@function_tool
async def play_bhajan(
    self,
    context: RunContext,
    bhajan_name: str,
    artist: str = None
) -> str:
    """Play a devotional bhajan (song) in the room.

    Use this when users request to hear a bhajan, devotional song,
    or spiritual music. The bhajan name can be in Hindi (Romanized) or English.

    Args:
        bhajan_name: The name of the bhajan requested (e.g., "hare krishna", "om namah shivaya")
        artist: Optional artist name if specified
    """
    # Implementation here
    return f"Playing {bhajan_name}..."
```

#### 1.2 LLM Integration

- Add tool description so LLM knows when to use it
- Detect bhajan requests from user prompts
- Extract bhajan name from natural language

### Phase 2: Audio Source Integration

#### 2.1 Local Bhajan Library (Priority 1)

```
Structure:
livekit_server/agent-starter-python/
  bhajans/
    krishna/
      hare-krishna-hare-rama.mp3
      govind-bolo-hari-gopal-bolo.mp3
    shiva/
      om-namah-shivaya.mp3
    generic/
      ...
  bhajan_index.json  # Metadata search index
```

**Features:**

- Search by name (fuzzy matching for Hindi/English)
- Categorize by deity (Krishna, Shiva, etc.)
- Support multiple formats

#### 2.2 Spotify Integration (Priority 2)

```python
# Using spotipy library
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

def search_spotify_bhajan(query: str):
    # Search for bhajan
    # Get preview URL or full track URL
    # Return audio stream URL
```

#### 2.3 YouTube Search (Metadata Only)

```python
# Use YouTube Data API to find video
# Then use legal streaming service or local library
def find_bhajan_info(query: str):
    # Search YouTube for reference
    # Return: video title, artist, duration
    # Use this to find in Spotify or local library
```

### Phase 3: LiveKit Audio Playback

#### 3.1 Audio Track Publishing

```python
from livekit import rtc
import aiohttp
import asyncio

async def play_audio_file(session: AgentSession, audio_path: str):
    """Play an audio file in the LiveKit room"""
    # 1. Read audio file
    # 2. Create LocalAudioTrack from file
    # 3. Publish to room
    # 4. Play audio
    # 5. Unpublish when done
```

#### 3.2 Audio Format Handling

- Support: MP3, WAV, OGG
- Convert to LiveKit-compatible format if needed
- Handle streaming for long bhajans

### Phase 4: User Experience

#### 4.1 Agent Response Flow

1. User: "krishna ka bhajan bajao" (Play Krishna's bhajan)
2. Agent: Uses `play_bhajan` tool
3. Agent: "मैं आपके लिए कृष्ण भजन चला रहा हूं..." (I'm playing Krishna bhajan for you)
4. Audio plays in room
5. Agent: "भजन समाप्त हो गया" (Bhajan finished)

#### 4.2 Error Handling

- If bhajan not found: "क्षमा करें, यह भजन उपलब्ध नहीं है" (Sorry, this bhajan is not available)
- Suggest similar bhajans
- Offer to add to library

## Implementation Steps

### Step 1: Setup Basic Infrastructure

- [ ] Create `bhajans/` directory structure
- [ ] Add audio processing library (pydub, ffmpeg)
- [ ] Create bhajan search/index system

### Step 2: Add Function Tool

- [ ] Implement `play_bhajan` function tool
- [ ] Add to Assistant agent class
- [ ] Test tool invocation from LLM

### Step 3: Local Library Integration

- [ ] Implement file search
- [ ] Add fuzzy matching for Hindi/English names
- [ ] Create metadata index (JSON)

### Step 4: Audio Playback

- [ ] Implement LiveKit audio track publishing
- [ ] Test with sample MP3 file
- [ ] Handle audio format conversion

### Step 5: Spotify Integration (Optional)

- [ ] Setup Spotify API credentials
- [ ] Implement search and streaming
- [ ] Handle authentication

### Step 6: Polish & Testing

- [ ] Add error handling
- [ ] Test with real Hindi prompts
- [ ] Optimize for latency
- [ ] Add logging

## Dependencies Needed

```toml
# For audio processing
pydub = "^0.25.1"
ffmpeg-python = "^0.2.0"

# For Spotify (optional)
spotipy = "^2.23.0"

# For YouTube search (metadata only)
google-api-python-client = "^2.100.0"
yt-dlp = "^2024.0.0"  # Only for metadata, not downloading

# For fuzzy search
fuzzywuzzy = "^0.18.0"
python-Levenshtein = "^0.23.0"
```

## Legal Considerations

1. **Copyright**: Only use:
   - Public domain bhajans
   - Properly licensed content
   - Creative Commons licensed songs

2. **YouTube**: Do NOT use yt-dlp or similar to download
   - Violates YouTube Terms of Service
   - Could result in legal action

3. **Recommendation**:
   - Start with local library of licensed/PD bhajans
   - Add Spotify for expanded catalog
   - Maintain proper attribution

## Alternative: Simple Approach

If full implementation is complex, start with:

1. **Pre-download 20-30 popular bhajans**
2. **Store in `bhajans/` folder**
3. **Simple file-based search**
4. **Basic audio playback**

Then expand later with Spotify API.

## File Structure

```
livekit_server/agent-starter-python/
  src/
    agent.py (add play_bhajan tool)
    bhajan_player.py (new file - audio playback logic)
    bhajan_search.py (new file - search local/Spotify)
  bhajans/
    krishna/
    shiva/
    rama/
    generic/
  bhajan_index.json
```

## Next Steps

1. **Decide on approach** (Local library + Spotify recommended)
2. **Create basic structure** (folders, index file)
3. **Implement function tool** in agent
4. **Add audio playback** capability
5. **Test with sample bhajan**
6. **Expand library** as needed
