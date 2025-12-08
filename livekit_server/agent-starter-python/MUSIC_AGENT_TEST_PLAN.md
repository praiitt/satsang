# RRAASI Music Agent Test Plan

## Test Date: 2025-11-30

## Overview
This document outlines the comprehensive testing plan for the RRAASI Music Agent, including music generation, playback, and Firebase persistence.

## System Architecture

### Components
1. **Frontend (Next.js)**: http://localhost:3000/rraasi-music
2. **Auth Server (Express)**: http://localhost:4000
3. **Music Agent (LiveKit Python)**: Connected to LiveKit Cloud
4. **Suno API**: External music generation service
5. **Firebase Firestore**: Database for storing music tracks

### Data Flow
```
User → Frontend → LiveKit → Music Agent → Suno API
                                    ↓
                              Auth Server (Callback)
                                    ↓
                              Firebase (music_tracks collection)
                                    ↓
                              Frontend (Playback)
```

## User Authentication Integration

### Changes Made
1. **Token Endpoint** (`/app/api/rraasi-music/token/route.ts`):
   - Added `userId` parameter to request type
   - Extract userId from request body
   - Include userId in participant token metadata

2. **Frontend Hook** (`/hooks/useRoom.ts`):
   - Modified to include `userId` from auth context in token request
   - Passes `authRef.current.user?.uid` to backend

3. **Music Agent** (`/src/music_agent.py`):
   - Updated `MusicAssistant` to accept and store `user_id`
   - Extract userId from participant metadata in `entrypoint`
   - Use `self.user_id` in:
     - Callback URL: `{auth_server_url}/suno/callback?userId={self.user_id}`
     - List tracks: `{auth_server_url}/suno/tracks?userId={self.user_id}`

4. **Auth Server** (`/auth-server/src/routes/suno.ts`):
   - Modified callback endpoint to extract userId from query parameters
   - Save tracks with actual userId instead of 'default_user'
   - Log userId for debugging

## Test Scenarios

### Test 1: User Authentication Check
**Objective**: Verify if user authentication is required to access the music page

**Steps**:
1. Open http://localhost:3000/rraasi-music in browser
2. Check if login is required
3. If required, authenticate with phone number

**Expected Result**:
- User can access the page (with or without authentication)
- If authenticated, userId should be available in auth context

### Test 2: Agent Connection
**Objective**: Verify the music agent connects successfully

**Steps**:
1. Click "Start Creating Music" button
2. Allow microphone access when prompted
3. Wait for agent connection
4. Listen for welcome message

**Expected Result**:
- Agent connects successfully
- Welcome message is heard: "Welcome to RRAASI Music Creator! I'm here to help you create beautiful healing music, bhajans, and meditation tracks. What kind of music would you like to create today?"
- Console logs show userId extraction

### Test 3: Music Generation Flow
**Objective**: Test the complete music generation workflow

**Steps**:
1. Connect to agent (Test 2)
2. Say: "I want to create a healing track"
3. Agent should ask clarifying questions about:
   - Genre/Style
   - Instruments
   - Mood/Energy
   - Vocals
   - Lyrics/Language
4. Provide details (example):
   - "I want a slow meditation track"
   - "With bamboo flute and soft tabla"
   - "Instrumental, no vocals"
   - "Peaceful and calming"
5. Agent should summarize and ask for confirmation
6. Say: "Yes, go ahead"
7. Wait for music generation (typically 60-90 seconds)

**Expected Result**:
- Agent asks appropriate questions
- Agent summarizes the request
- Agent confirms before generating
- Agent responds: "I have started creating your music: '[title]'. I will play it for you once it's ready (usually takes about a minute)."
- Music plays automatically when ready

### Test 4: Firebase Persistence
**Objective**: Verify music tracks are saved to Firebase with correct userId

**Steps**:
1. Complete Test 3 (generate music)
2. Check auth server logs for callback
3. Verify Firebase Firestore collection `music_tracks`
4. Check document fields

**Expected Result**:
- Auth server logs show:
  ```
  [Suno Callback] Received callback: {...}
  [Suno Callback] UserId from query: [actual_user_id]
  [Suno Callback] Saved track: [title] ([clip_id]) for user: [actual_user_id]
  ```
- Firebase document contains:
  ```javascript
  {
    taskId: "...",
    clipId: "...",
    title: "...",
    audioUrl: "https://...",
    userId: "[actual_user_id]", // NOT "default_user"
    createdAt: Timestamp,
    metadata: {
      modelName: "V3_5",
      prompt: "...",
      style: "...",
      ...
    }
  }
  ```

### Test 5: Track Retrieval
**Objective**: Verify user can retrieve their previously created tracks

**Steps**:
1. Generate at least one track (Test 3)
2. Say to agent: "Show me my tracks" or "What music have I created?"
3. Agent should call `list_tracks` tool

**Expected Result**:
- Agent responds with list of tracks
- Only tracks for the current user are shown
- Most recent tracks appear first
- Response format:
  ```
  Here are your recent tracks (most recent first):
  1. [Title] - [Listen](url)
  2. [Title] - [Listen](url)
  ...
  ```

### Test 6: Music Playback
**Objective**: Verify generated music plays correctly

**Steps**:
1. Complete Test 3 (generate music)
2. Wait for music to be ready
3. Listen to the track

**Expected Result**:
- Music plays automatically when ready
- Audio quality is good
- Track matches the requested specifications
- Frontend receives data via `bhajan.track` topic with payload:
  ```javascript
  {
    mp3Url: "https://...",
    name: "[title]",
    artist: "RRAASI AI",
    message: "Here is your generated music: [title]"
  }
  ```

### Test 7: Multiple Users
**Objective**: Verify tracks are isolated per user

**Steps**:
1. Login as User A
2. Generate a track
3. Logout
4. Login as User B
5. Generate a different track
6. Ask agent to list tracks
7. Logout
8. Login as User A again
9. Ask agent to list tracks

**Expected Result**:
- User A sees only their tracks
- User B sees only their tracks
- No cross-contamination of tracks between users

## Monitoring Points

### Frontend Console
- Token request with userId
- LiveKit connection status
- Data messages received on `bhajan.track` topic

### Auth Server Logs
- Token generation with userId
- Callback received with userId
- Track saved to Firebase

### Music Agent Logs
- UserId extraction from participant metadata
- Music generation request
- Polling status
- Track ready notification

### Firebase Console
- New documents in `music_tracks` collection
- Correct userId field
- All metadata fields populated

## Known Issues & Limitations

1. **Default User Fallback**: If userId cannot be extracted, system falls back to "default_user"
2. **Anonymous Users**: Users not logged in will have tracks saved under "default_user"
3. **Polling Timeout**: Music generation has a 5-minute timeout (60 retries × 5s)
4. **Single Room**: All users connect to the same room "RRaaSiMusic"

## Success Criteria

✅ All servers start successfully
✅ Agent connects and sends welcome message
✅ Agent asks clarifying questions before generating
✅ Music generates successfully
✅ Music plays automatically when ready
✅ Tracks saved to Firebase with correct userId
✅ Users can retrieve their own tracks
✅ Track isolation between users works correctly

## Next Steps

1. Test with actual user authentication
2. Verify Firebase persistence
3. Test track retrieval
4. Test multiple users
5. Document any issues found
6. Create user documentation

## Environment Variables Required

### Frontend (.env.local)
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- Firebase config

### Auth Server (.env.local)
- `OPENAI_API_KEY`
- Firebase service account

### Music Agent (.env.local)
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `SUNO_API_KEY`
- `AUTH_SERVER_URL=http://localhost:4000`
