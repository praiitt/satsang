# HeyGen Podcast API (Two Avatars)

This module lets you create a **two-avatar podcast-style conversation** using HeyGen photo avatars.

## Environment Variables

Set these in the `auth-server` environment (e.g. `.env` next to `package.json`):

```env
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_BASE_URL=https://api.heygen.com
```

## Endpoints

### 1) Create Podcast Job

**POST** `/podcast`

Authenticated (uses `requireAuth`), so you must include a valid auth cookie/session.

**Request Body:**

```json
{
  "hostAvatarId": "avatar_id_for_host",
  "guestAvatarId": "avatar_id_for_guest",
  "turns": [
    { "speaker": "host",  "text": "Welcome to our satsang podcast..." },
    { "speaker": "guest", "text": "Thank you for inviting me..." }
  ],
  "options": {
    "ratio": "16:9",
    "resolution": "720p",
    "voiceIdHost": "optional_voice_id_for_host",
    "voiceIdGuest": "optional_voice_id_for_guest"
  }
}
```

**Response (201):**

```json
{
  "jobId": "podcastJob123",
  "status": "queued",
  "turns": [
    {
      "index": 0,
      "speaker": "host",
      "status": "queued",
      "heygenVideoId": "heygen_video_id_host_0"
    },
    {
      "index": 1,
      "speaker": "guest",
      "status": "queued",
      "heygenVideoId": "heygen_video_id_guest_1"
    }
  ]
}
```

What happens:

- For each turn, the server calls HeyGen `create video` API with:
  - `avatar_id`: host or guest avatar
  - `input_text`: that turn's text
  - optional voice, ratio, resolution
- A Firestore document is created in `marketing_podcasts` with:
  - `jobId`, `hostAvatarId`, `guestAvatarId`
  - `turns` (per-turn HeyGen video IDs + status)
  - `status` (`queued` / `processing` / `ready` / `failed`)

### 2) Get Podcast Job Status

**GET** `/podcast/:jobId`

**Response:**

```json
{
  "jobId": "podcastJob123",
  "status": "processing",
  "hostAvatarId": "avatar_id_for_host",
  "guestAvatarId": "avatar_id_for_guest",
  "turns": [
    {
      "index": 0,
      "speaker": "host",
      "status": "ready",
      "heygenVideoId": "heygen_video_id_host_0",
      "videoUrl": "https://cdn.heygen.com/video_host_0.mp4"
    },
    {
      "index": 1,
      "speaker": "guest",
      "status": "processing",
      "heygenVideoId": "heygen_video_id_guest_1",
      "videoUrl": null
    }
  ]
}
```

On each GET:

- For any turn that is **not** `ready` or `failed`, the server:
  - calls HeyGen `video.status` endpoint
  - updates `status` and `videoUrl` for that turn in Firestore
- Aggregates job `status`:
  - `ready` if all turns are `ready`
  - `failed` if any turn is `failed`
  - otherwise `processing`

> **Note:** This version returns **per-turn clip URLs** (one clip per avatar turn).  
> Frontend can play them in sequence to create a podcast-like experience.  
> A later phase can add FFmpeg merging into a single final video if desired.

## Frontend Usage (Concept)

1. Build a conversation editor in your marketing UI:
   - Choose `hostAvatarId` and `guestAvatarId`
   - Enter turns: `[ { speaker: 'host', text }, { speaker: 'guest', text }, ... ]`
2. Call `POST /podcast` to start job.
3. Poll `GET /podcast/:jobId` every few seconds:
   - Show per-turn statuses
   - When `status === 'ready'`, all `turns[i].videoUrl` should be populated.
4. In the UI, render a playlist-like player:
   - Play clip 0 → clip 1 → clip 2 ... in order to simulate a continuous podcast.

## HeyGen API Notes

- The implementation uses:
  - `POST /v1/video.generate` for creation
  - `GET /v1/video.status?video_id=...` for status
- If your HeyGen account uses a different base path or fields:
  - Update `auth-server/src/services/heygen.ts` to match your docs:
    - `path` for creation and status
    - how to read `video_id`, `status`, and `video_url` from `json.data`


