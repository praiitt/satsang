# Meditation Backend API

REST API endpoints for RRAASI Meditation sessions, playlists, and statistics.

## Base URL

```
Development: http://localhost:4000/meditation
Production: https://satsang-auth-server-6ougd45dya-el.a.run.app/meditation
```

## Endpoints

### Sessions

#### GET /meditation/sessions
Get user's meditation sessions

**Query Parameters:**
- `userId` (required): User ID
- `limit` (optional, default: 10): Number of sessions to return

**Response:**
```json
{
  "sessions": [
    {
      "id": "session_id",
      "userId": "user_123",
      "intention": "Peace and clarity",
      "mood_before": "stressed",
      "mood_after": "peaceful",
      "musicUsed": ["track_id_1", "track_id_2"],
      "generatedMusic": false,
      "duration": 1500,
      "completedAt": "2024-01-25T10:30:00Z",
      "agentGuided": true,
      "notes": "Felt amazing!"
    }
  ]
}
```

#### GET /meditation/sessions/:id
Get specific session by ID

**Response:**
```json
{
  "session": {
    "id": "session_id",
    ...
  }
}
```

#### POST /meditation/sessions
Create new meditation session

**Request Body:**
```json
{
  "userId": "user_123",
  "intention": "Release stress",
  "mood_before": "stressed",
  "mood_after": "peaceful",
  "musicUsed": ["track_id_1"],
  "generatedMusic": false,
  "duration": 1500,
  "agentGuided": true,
  "notes": "Beautiful session"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "new_session_id",
  "message": "Session saved successfully"
}
```

#### PATCH /meditation/sessions/:id/mood
Update post-meditation mood

**Request Body:**
```json
{
  "mood_after": "peaceful",
  "notes": "Feeling centered and calm"
}
```

---

### Statistics

#### GET /meditation/stats
Get user statistics

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "stats": {
    "totalSessions": 42,
    "totalMinutes": 1050,
    "currentStreak": 7,
    "longestStreak": 14,
    "lastSessionDate": "2024-01-25T10:30:00Z",
    "moodTrends": {
      "before": {
        "stressed": 15,
        "peaceful": 12,
        "tired": 10,
        "joyful": 5
      },
      "after": {
        "peaceful": 30,
        "joyful": 8,
        "centered": 4
      }
    }
  }
}
```

---

### Playlists

#### GET /meditation/playlists
Get meditation playlists

**Query Parameters:**
- `userId` (optional): Include user's private playlists
- `sessionType` (optional): Filter by type (morning, evening, celebration, deep)

**Response:**
```json
{
  "playlists": [
    {
      "id": "playlist_id",
      "name": "Morning Energy",
      "description": "Uplifting dance meditation...",
      "sessionType": "morning",
      "trackIds": ["track_1", "track_2"],
      "duration": 25,
      "bpmRange": { "min": 100, "max": 120 },
      "createdBy": "official",
      "isOfficial": true,
      "isPublic": true
    }
  ]
}
```

#### POST /meditation/playlists
Create custom playlist

**Request Body:**
```json
{
  "name": "My Custom Flow",
  "description": "Personal meditation playlist",
  "sessionType": "morning",
  "trackIds": ["track_1", "track_2", "track_3"],
  "duration": 20,
  "bpmRange": { "min": 80, "max": 100 },
  "createdBy": "user_123",
  "isPublic": false
}
```

---

### Music Recommendations

#### GET /meditation/music/recommended
Get recommended music for meditation

**Query Parameters:**
- `mood` (optional, default: "peaceful"): User's mood
- `bpmPreference` (optional, default: "medium"): slow | medium | energetic

**Response:**
```json
{
  "tracks": [
    {
      "id": "track_id",
      "title": "Om Shanti",
      "bpm": 85,
      "tags": ["peaceful", "meditation"],
      "audioUrl": "https://..."
    }
  ],
  "count": 5
}
```

---

## Testing

### Seed Initial Playlists
```bash
cd auth-server
npx tsx src/meditation/seed-playlists.ts
```

### Test API Endpoints
```bash
# Get sessions
curl "http://localhost:4000/meditation/sessions?userId=test_user&limit=5"

# Get stats
curl "http://localhost:4000/meditation/stats?userId=test_user"

# Get playlists
curl "http://localhost:4000/meditation/playlists?sessionType=morning"

# Get recommended music
curl "http://localhost:4000/meditation/music/recommended?mood=peaceful&bpmPreference=medium"

# Create session
curl -X POST "http://localhost:4000/meditation/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "intention": "Peace",
    "mood_before": "stressed",
    "duration": 1500,
    "musicUsed": [],
    "agentGuided": true
  }'
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing parameters)
- `404` - Not Found
- `500` - Internal Server Error
