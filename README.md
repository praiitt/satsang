# satsang

A spiritual voice assistant for Hindu and Sanātana Dharma teachings, built with LiveKit Agents.

## 🧠 Agent Memory
For developers and AI agents: Critical infrastructure details and common fixes are documented in **[AGENT_MEMORY.md](./AGENT_MEMORY.md)**. Please refer to this file before making deployment changes.

## Features

- Real-time voice interaction with a spiritual guru assistant
- Hindi language support (STT, LLM, and TTS)
- Modern spiritual web app UI with saffron theme
- Screen wake lock to keep the screen active during conversations
- Customizable TTS voice settings

## Getting Started

### Frontend

```bash
pnpm install
pnpm dev
```

### Backend Agent

The Python agent is located in `livekit_server/agent-starter-python/`. See that directory for setup instructions.

## Configuration

Update `app-config.ts` for branding and UI customization.

## Environment Variables

Configure credentials in `.env.local`:

### LiveKit (Required)

```env
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=https://your-livekit-server-url
```

### TTS Settings

```env
TTS_VOICE_ID=your_voice_id
TTS_SPEED=slow
```

### Spotify (For Bhajan Playback)

```env
# Spotify API access token for searching tracks
SPOTIFY_ACCESS_TOKEN=your_spotify_access_token
SPOTIFY_CLIENT_ID=65136cefd17d48ffb4c7d6ca07dd533f
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

**Note**:

- Backend uses Spotify API to search for bhajans and returns preview URLs (MP3)
- Frontend uses simple HTML5 audio player to play the MP3 URLs
- No complex OAuth or SDK required - just URL + audio player
- Preview URLs are 30-second previews (Spotify limitation)
