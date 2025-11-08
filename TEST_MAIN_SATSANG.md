# Testing Main Satsang with YouTube Integration

## Prerequisites

1. ✅ Next.js server running on `http://localhost:3000`
2. ⏳ LiveKit agent server running (start with commands below)
3. ✅ YouTube API key configured in backend `.env.local`

## Starting the Servers

### 1. Start Next.js Frontend (Already Running)

```bash
cd /Users/prakash/Documents/satsang/satsangapp
npm run dev
```

✅ Server should be running at: `http://localhost:3000`

### 2. Start LiveKit Agent (Required for Satsang)

```bash
cd /Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python
./start-local.sh
```

The agent will:

- Load environment variables from `.env.local`
- Download required models if needed
- Start listening for LiveKit room connections
- Enable YouTube bhajan search functionality

## Testing Steps

### Step 1: Open Main Satsang Page

1. Navigate to: `http://localhost:3000`
2. You should see the welcome page with Hindi content
3. Look for the button: **"गुरुजी से बातचीत करें"** (Chat with Guruji)

### Step 2: Start a Satsang Session

1. Click **"गुरुजी से बातचीत करें"** button
2. Allow microphone access when prompted
3. Wait for the agent to connect (you'll see connection status)

### Step 3: Request a Bhajan

1. Say or type: **"krishna ka bhajan bajao"** or **"hare krishna sunao"**
2. The agent should:
   - Search YouTube for the bhajan
   - Send data via LiveKit data channel with `youtube_id`
   - Frontend YouTube player should automatically play the video

### Step 4: Verify YouTube Playback

1. Open browser console (F12)
2. Look for logs like:
   ```
   [YouTubeBhajanPlayer] 🔵 Parsed JSON: {youtube_id: "...", name: "..."}
   [YouTubeBhajanPlayer] ✅✅✅ Data event received - playing YouTube video
   [YouTubeBhajanPlayer] ▶️  Starting playback of video: ...
   ```
3. You should hear audio playing (video plays in background, no UI)

## Expected Behavior

### Backend (Agent)

- Searches YouTube when bhajan is requested
- Sends data channel message with format:
  ```json
  {
    "youtube_id": "Zdcth9NndEA",
    "youtube_url": "https://www.youtube.com/watch?v=Zdcth9NndEA",
    "name": "Hare Krishna Bhajan",
    "artist": "Spiritual Mantra",
    "message": "भजन चल रहा है। आनंद लें!",
    "spotify_id": "...",
    "url": "..."
  }
  ```

### Frontend (YouTube Player)

- Receives data channel message with topic `'bhajan.track'`
- Extracts YouTube video ID from `youtube_id` or `youtube_url`
- Plays video automatically in background
- No UI display (silent background playback)

## Troubleshooting

### Agent Not Connecting

- Check if agent is running: `ps aux | grep "agent.py"`
- Check agent logs for errors
- Verify `.env.local` has correct LiveKit credentials

### YouTube Video Not Playing

- Check browser console for errors
- Verify YouTube API key is set in backend
- Check if autoplay is blocked (may need user interaction first)
- Look for `[YouTubeBhajanPlayer]` logs in console

### No Audio

- Check browser audio permissions
- Verify YouTube player is ready: Look for `[YouTubePlayer] ✅ Player ready`
- Check if video is actually playing: Look for `[YouTubePlayer] State changed: 1 PLAYING`

## Test Pages Available

1. **Main Satsang**: `http://localhost:3000/`
2. **YouTube Player Test**: `http://localhost:3000/test-youtube`
3. **Data Binding Test**: `http://localhost:3000/test-youtube-binding`

## Quick Test Commands

```bash
# Check if servers are running
lsof -i:3000  # Next.js
ps aux | grep "agent.py"  # LiveKit agent

# Start Next.js (if not running)
npm run dev

# Start LiveKit agent (if not running)
cd livekit_server/agent-starter-python && ./start-local.sh
```

## Success Indicators

✅ Agent connects and responds to voice/text
✅ When you request a bhajan, YouTube video plays automatically
✅ Console shows successful data channel message receipt
✅ Audio plays (you can hear the bhajan)
✅ No UI elements visible (background playback only)
