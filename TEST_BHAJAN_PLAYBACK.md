# Testing Bhajan Playback (Preview URLs)

## Quick Setup

### 1. Backend (Agent) Setup

Make sure your agent has Spotify credentials in `.env.local`:

```bash
cd livekit_server/agent-starter-python
```

Add to `.env.local`:
```env
SPOTIFY_ACCESS_TOKEN=your_spotify_access_token
SPOTIFY_CLIENT_ID=65136cefd17d48ffb4c7d6ca07dd533f
SPOTIFY_CLIENT_SECRET=ea9d1474251b460ea358ce146afe2a44
```

### 2. Start the Agent

```bash
cd livekit_server/agent-starter-python
uv run python src/agent.py dev
```

Or with PM2:
```bash
./start-pm2.sh
```

### 3. Start the Frontend

```bash
# In project root
pnpm dev
```

## Testing

### Test 1: Basic Bhajan Request

1. Open http://localhost:3000
2. Start a session with the agent
3. Say or type: **"hare krishna bhajan bajao"** or **"om namah shivaya sunao"**
4. The agent should:
   - Search Spotify for the bhajan
   - Return a JSON response with preview URL
   - Frontend automatically plays the 30-second preview

### Test 2: Check Console

Open browser DevTools (F12) and check:
- **Console**: Should see audio playback logs
- **Network**: Should see request to Spotify preview URL
- **Audio**: Should hear 30-second preview playing

### Test 3: Test Different Bhajans

Try these requests:
- "jai ganesh bhajan"
- "govind bolo"
- "rama bhajan"
- "krishna bhajan"

## Expected Behavior

✅ **Success:**
- Agent responds with message in Hindi
- Audio automatically starts playing (30 seconds)
- No errors in console

❌ **If not working:**
- Check agent logs for Spotify API errors
- Check browser console for audio errors
- Verify `SPOTIFY_ACCESS_TOKEN` is set correctly
- Check if agent message contains `{"url": "https://..."}`

## Debugging

### Check Agent Logs
```bash
# If using PM2
pm2 logs satsang

# If running directly
# Check terminal output
```

### Check Frontend
- Open browser DevTools → Console
- Look for messages like:
  - "Error playing audio" → Check URL validity
  - "Not JSON" → Agent response format issue
  - No errors → Check if audio element is created

### Test Spotify API Directly
```bash
cd livekit_server/agent-starter-python
SPOTIFY_ACCESS_TOKEN=your_token python test_spotify_bhajan.py "hare krishna"
```

## Notes

- Preview URLs are **30-second previews only** (Spotify limitation)
- If no preview URL available, agent shows error with Spotify link
- Audio plays automatically when agent returns URL
- No user interaction needed - just ask for bhajan!

