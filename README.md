# satsang

A spiritual voice assistant for Hindu and Sanātana Dharma teachings, built with LiveKit Agents.

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
# Option 1: Direct access token (for testing)
SPOTIFY_ACCESS_TOKEN=your_spotify_access_token

# Option 2: OAuth credentials (for production)
SPOTIFY_CLIENT_ID=65136cefd17d48ffb4c7d6ca07dd533f
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://satsang.rraasi.com/api/spotify/callback
```

**Note**: 
- Add `SPOTIFY_REDIRECT_URI` to your Spotify app's "Redirect URIs" in the Spotify Developer Dashboard
- `SPOTIFY_CLIENT_SECRET` should be kept secure and never exposed to the frontend
- For production, use OAuth flow (Option 2) instead of direct access tokens
