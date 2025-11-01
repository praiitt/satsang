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

Configure LiveKit credentials in `.env.local`:

```env
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=https://your-livekit-server-url
TTS_VOICE_ID=your_voice_id
TTS_SPEED=slow
```
