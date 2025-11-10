# HeyGen Avatar Text-to-Speech Usage Guide

Yes, you can use a HeyGen photo avatar ID in your Next.js app to speak any text! This guide explains how.

## Overview

HeyGen provides two ways to use photo avatars:

1. **Streaming API** (Real-time) - Avatar speaks text in real-time via WebRTC
2. **Video Generation API** (Pre-recorded) - Generates a video file of the avatar speaking

This implementation uses the **Streaming API** for real-time text-to-speech.

## Prerequisites

1. **HeyGen API Key**: Get your API key from [HeyGen Dashboard](https://app.heygen.com/)
2. **Photo Avatar ID**: Your avatar ID from HeyGen
3. **Environment Variables**: Set in `.env.local`:

```env
HEYGEN_API_KEY=your_api_key_here
HEYGEN_AVATAR_ID=your_avatar_id_here
# Optional: For frontend use
NEXT_PUBLIC_HEYGEN_AVATAR_ID=your_avatar_id_here
```

## How to Get Your Photo Avatar ID

1. Go to [HeyGen Dashboard](https://app.heygen.com/)
2. Navigate to "Avatars" section
3. Find your photo avatar
4. Copy the Avatar ID (usually looks like: `abc123def456...`)

## Usage Examples

### 1. Using the Hook Directly

```tsx
'use client';

import { useHeygenTextToSpeech } from '@/hooks/useHeygenTextToSpeech';

export function MyComponent() {
  const { speak, isReady, isSpeaking } = useHeygenTextToSpeech({
    avatarId: 'your-avatar-id', // Optional, uses env var if not provided
    autoStart: true, // Auto-initialize session on mount
  });

  const handleSpeak = async () => {
    await speak('नमस्ते! मैं आपका आध्यात्मिक गुरु हूं।');
  };

  return (
    <div>
      <button onClick={handleSpeak} disabled={!isReady || isSpeaking}>
        {isSpeaking ? 'Speaking...' : 'Speak Hindi Text'}
      </button>
    </div>
  );
}
```

### 2. Using the Button Component

```tsx
'use client';

import { HeygenTextToSpeechButton } from '@/components/heygen/heygen-text-to-speech-button';

export function MyComponent() {
  return (
    <HeygenTextToSpeechButton
      avatarId="your-avatar-id"
      text="नमस्ते! मैं आपका आध्यात्मिक गुरु हूं।"
      onSpeakStart={() => console.log('Started speaking')}
      onSpeakEnd={() => console.log('Finished speaking')}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

### 3. Speaking Dynamic Text

```tsx
'use client';

import { useState } from 'react';
import { useHeygenTextToSpeech } from '@/hooks/useHeygenTextToSpeech';

export function DynamicSpeaker() {
  const [text, setText] = useState('');
  const { speak, isReady } = useHeygenTextToSpeech({
    avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID,
  });

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to speak..."
      />
      <button
        onClick={() => speak(text)}
        disabled={!isReady || !text}
      >
        Speak
      </button>
    </div>
  );
}
```

### 4. Using with Existing Avatar Player Component

The existing `HeygenAvatarPlayer` component already supports this! You can use the global function:

```tsx
// After the avatar player is mounted
window.heygenSendText('नमस्ते! मैं आपका आध्यात्मिक गुरु हूं।', 'talk');
```

## API Routes

The following API routes are available:

### 1. Create Session
```
POST /api/heygen/session/new
Body: { avatar_id?: string, avatar_name?: string }
```

### 2. Start Session
```
POST /api/heygen/session/start
Body: { session_id: string, session_token: string }
```

### 3. Send Text to Speak
```
POST /api/heygen/session/task
Body: { session_id: string, session_token: string, text: string, task_type?: 'talk' | 'repeat' }
```

### 4. Stop Session
```
POST /api/heygen/session/stop
Body: { session_id: string, session_token: string }
```

## Features

- ✅ Real-time text-to-speech
- ✅ Supports any text (Hindi, English, etc.)
- ✅ Photo avatar support
- ✅ Easy-to-use React hooks
- ✅ Button component for quick integration
- ✅ Error handling
- ✅ Session management

## Limitations

1. **Browser Support**: Requires WebRTC support (modern browsers)
2. **Network**: Requires stable internet connection
3. **API Limits**: Subject to HeyGen API rate limits
4. **Audio Only**: The streaming API provides audio only (video requires the video player component)

## Troubleshooting

### Avatar not speaking
- Check that `HEYGEN_API_KEY` is set correctly
- Verify the avatar ID is correct
- Check browser console for errors
- Ensure session is initialized before speaking

### Session creation fails
- Verify API key is valid
- Check network connectivity
- Review HeyGen API documentation for changes

### Audio not playing
- Check browser audio permissions
- Verify WebRTC is supported
- Check browser console for errors

## Next Steps

1. Set up environment variables
2. Get your avatar ID from HeyGen
3. Try the examples above
4. Integrate into your app!

## Resources

- [HeyGen API Documentation](https://docs.heygen.com/)
- [HeyGen Dashboard](https://app.heygen.com/)
- [HeyGen Interactive Avatar Demo](https://github.com/HeyGen-Official/InteractiveAvatarNextJSDemo)

