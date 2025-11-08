# YouTube Data Binding Test

## Backend Data Format

The backend sends the following JSON via LiveKit data channel:

```json
{
  "url": "https://p.scdn.co/mp3-preview/...",
  "name": "Hare Krishna",
  "artist": "Various Artists",
  "spotify_id": "4uLU6hMCyIA",
  "external_url": "https://open.spotify.com/track/...",
  "youtube_id": "Zdcth9NndEA",
  "youtube_url": "https://www.youtube.com/watch?v=Zdcth9NndEA",
  "message": "भजन 'Hare Krishna' चल रहा है। आनंद लें!"
}
```

## Frontend Binding Verification

### 1. Field Extraction Priority

The frontend extracts YouTube video ID in this priority order:

1. ✅ `youtube_id` - Direct video ID (preferred)
2. ✅ `youtube_url` - Full YouTube URL
3. ✅ `videoId` - Daily Satsang format
4. ✅ `url` - Fallback (if it's a YouTube URL)

### 2. Required Fields

- ✅ `youtube_id` or `youtube_url` - Required for playback
- ✅ `name` - Required for display
- ⚠️ `artist` - Optional but displayed if available
- ⚠️ `message` - Optional but displayed if available

### 3. Data Binding

All fields from backend are properly bound:

- ✅ `youtube_id` → `videoInfo.youtube_id`
- ✅ `youtube_url` → `videoInfo.youtube_url`
- ✅ `name` → `videoInfo.name`
- ✅ `artist` → `videoInfo.artist`
- ✅ `message` → `videoInfo.message`
- ✅ `url` → `videoInfo.url` (preserved from backend)

### 4. Video ID Extraction

- ✅ Extracts from `youtube_id` if it's a valid 11-character ID
- ✅ Extracts from `youtube_url` using regex
- ✅ Handles various YouTube URL formats:
  - `https://youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://youtube.com/embed/VIDEO_ID`

## Test Cases

### Test Case 1: Backend sends youtube_id

```json
{
  "youtube_id": "Zdcth9NndEA",
  "name": "Hare Krishna"
}
```

**Expected**: ✅ Video plays using `Zdcth9NndEA`

### Test Case 2: Backend sends youtube_url

```json
{
  "youtube_url": "https://www.youtube.com/watch?v=Zdcth9NndEA",
  "name": "Hare Krishna"
}
```

**Expected**: ✅ Video ID extracted and plays

### Test Case 3: Backend sends both youtube_id and youtube_url

```json
{
  "youtube_id": "Zdcth9NndEA",
  "youtube_url": "https://www.youtube.com/watch?v=Zdcth9NndEA",
  "name": "Hare Krishna",
  "artist": "Various Artists"
}
```

**Expected**: ✅ Uses `youtube_id` (higher priority), plays video

### Test Case 4: Backend sends all fields

```json
{
  "url": "https://p.scdn.co/mp3-preview/...",
  "name": "Hare Krishna",
  "artist": "Various Artists",
  "spotify_id": "4uLU6hMCyIA",
  "external_url": "https://open.spotify.com/track/...",
  "youtube_id": "Zdcth9NndEA",
  "youtube_url": "https://www.youtube.com/watch?v=Zdcth9NndEA",
  "message": "भजन 'Hare Krishna' चल रहा है। आनंद लें!"
}
```

**Expected**: ✅ All fields bound correctly, YouTube video plays

### Test Case 5: Missing youtube_id/youtube_url

```json
{
  "name": "Hare Krishna",
  "spotify_id": "4uLU6hMCyIA"
}
```

**Expected**: ⚠️ Rejected (no YouTube ID), Spotify player may handle

## Console Logging

The component logs detailed information for debugging:

- ✅ Raw decoded data
- ✅ Parsed JSON object
- ✅ Available fields check
- ✅ Video ID extraction process
- ✅ Final video info object
- ✅ Playback start confirmation

## Verification Checklist

- [x] `youtube_id` field is extracted and used
- [x] `youtube_url` field is extracted and used
- [x] `name` field is bound to videoInfo
- [x] `artist` field is bound to videoInfo
- [x] `message` field is bound to videoInfo
- [x] `url` field is preserved
- [x] Video ID extraction works from all formats
- [x] Proper error handling for missing fields
- [x] Console logging for debugging
- [x] Development mode display shows all fields

## Status

✅ **All data binding verified and working correctly**
