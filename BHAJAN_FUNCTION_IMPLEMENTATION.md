# Bhajan Playback Function Implementation

## Overview

Added LLM function call functionality to enable the Guruji agent to play devotional bhajans (songs) when users request them. The function searches for MP3 files from a local directory and returns URLs that the frontend can use to play the audio.

## Implementation Details

### 1. Function Tool (`play_bhajan`)

**Location:** `livekit_server/agent-starter-python/src/agent.py`

The agent now has a `@function_tool` decorated method that:

- Detects when users request bhajans (e.g., "krishna ka bhajan bajao", "hare krishna sunao")
- Searches for matching bhajans in the local library
- Returns a JSON string with the URL to play the bhajan

**Example Usage:**

```python
@function_tool
async def play_bhajan(
    self,
    context: RunContext,
    bhajan_name: str,
    artist: str = None,
) -> str:
    # Returns: {"url": "/api/bhajans/krishna/hare-krishna-hare-rama.mp3", ...}
```

### 2. Bhajan Search Module

**Location:** `livekit_server/agent-starter-python/src/bhajan_search.py`

Features:

- Searches `bhajan_index.json` for matching bhajans
- Supports fuzzy matching for Hindi (Romanized) and English names
- Handles aliases and partial matches
- Returns URLs formatted for the Next.js API route

**Key Functions:**

- `get_bhajan_url(bhajan_name, base_url)` - Main function to get bhajan URL
- `find_bhajan_by_name(query)` - Search logic
- `list_available_bhajans()` - Get all available bhajan names

### 3. Next.js API Route

**Location:** `app/api/bhajans/[...path]/route.ts`

Serves MP3 files from the agent's bhajan directory:

- Route: `/api/bhajans/{category}/{filename}.mp3`
- Example: `/api/bhajans/krishna/hare-krishna-hare-rama.mp3`
- Supports: MP3, WAV, OGG, M4A
- Includes security checks (prevents directory traversal)
- Proper content-type headers for audio streaming

### 4. Bhajan Index

**Location:** `livekit_server/agent-starter-python/bhajans/bhajan_index.json`

JSON file containing metadata for all available bhajans:

```json
{
  "bhajans": [
    {
      "name_en": "Hare Krishna Hare Rama",
      "name_hi": "हरे कृष्ण हरे राम",
      "file_path": "krishna/hare-krishna-hare-rama.mp3",
      "category": "krishna",
      "aliases": ["hare krishna", "hare rama", ...]
    }
  ]
}
```

## How It Works

### Flow:

1. **User Request:** "krishna ka bhajan bajao" (Play Krishna's bhajan)
2. **LLM Detection:** The LLM recognizes this as a bhajan request
3. **Function Call:** LLM calls `play_bhajan(bhajan_name="krishna")`
4. **Search:** Function searches `bhajan_index.json` for matching bhajan
5. **URL Generation:** Returns URL like `/api/bhajans/krishna/hare-krishna-hare-rama.mp3`
6. **Frontend:** Frontend receives the URL and can play it using HTML5 audio or similar

### Example Response:

```json
{
  "url": "/api/bhajans/krishna/hare-krishna-hare-rama.mp3",
  "name": "krishna",
  "message": "भजन 'krishna' चल रहा है। आनंद लें!"
}
```

## Adding New Bhajans

1. **Place MP3 file** in appropriate directory:

   ```
   livekit_server/agent-starter-python/bhajans/krishna/my-bhajan.mp3
   ```

2. **Update `bhajan_index.json`**:

   ```json
   {
     "name_en": "My Bhajan",
     "name_hi": "मेरा भजन",
     "file_path": "krishna/my-bhajan.mp3",
     "category": "krishna",
     "aliases": ["my bhajan", "mera bhajan", "bhajan"]
   }
   ```

3. **Restart the agent** (if needed)

## Configuration

### Environment Variables

- `BHAJAN_API_BASE_URL` (optional): Base URL for bhajan API
  - Example: `https://satsang.rraasi.com`
  - If not set, uses relative paths

- `BHAJAN_BASE_PATH` (Next.js): Path to bhajan directory
  - Default: `../livekit_server/agent-starter-python/bhajans`
  - Can be set in `.env.local` for custom deployments

## Testing

1. **Test Function Call:**
   - Ask agent: "krishna ka bhajan bajao"
   - Agent should call `play_bhajan` function
   - Check logs for function invocation

2. **Test API Route:**
   - Visit: `http://localhost:3000/api/bhajans/krishna/hare-krishna-hare-rama.mp3`
   - Should return MP3 file with proper headers

3. **Test Search:**
   - Try different variations: "hare krishna", "krishna bhajan", "hare rama"
   - All should match and return the same bhajan

## Frontend Integration (Next Steps)

The function returns a URL that the frontend can use. To actually play the audio:

1. **Detect Function Result:** Parse the JSON response from the agent
2. **Extract URL:** Get the `url` field from the response
3. **Play Audio:** Use HTML5 Audio API or a library like `react-audio-player`

Example:

```typescript
// When agent returns bhajan URL
const response = JSON.parse(agentResponse);
if (response.url) {
  const audio = new Audio(response.url);
  audio.play();
}
```

## Directory Structure

```
livekit_server/agent-starter-python/
  src/
    agent.py              # Contains play_bhajan function tool
    bhajan_search.py      # Search logic
  bhajans/
    krishna/              # Krishna bhajans
    shiva/                # Shiva bhajans
    ganesh/                # Ganesh bhajans
    rama/                  # Rama bhajans
    generic/               # Generic spiritual songs
    bhajan_index.json      # Metadata index

app/api/bhajans/
  [...path]/
    route.ts              # Next.js API route to serve MP3 files
```

## Notes

- The function automatically handles Hindi (Romanized) input
- Supports fuzzy matching for common variations
- Returns helpful error messages if bhajan not found
- Lists available bhajans in error responses
- All file access is secure (prevents directory traversal)
