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
      <button onClick={() => speak(text)} disabled={!isReady || !text}>
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

## Pricing & Costs

### For 1 Minute of Avatar Speech

**Important Note**: The pricing below is for the **Video Generation API** (pre-recorded videos). The **Streaming API** (real-time text-to-speech) may have different pricing. Please check HeyGen's official pricing page for the most current streaming API costs.

#### Free Plan

- **Cost**: $0/month
- **Credits**: 10 API credits per month
- **Credit Usage**: 1 minute of video = 0.2 credits
- **Total**: ~50 minutes of video per month (free)
- **For 1 minute**: 0.2 credits (free within monthly limit)

#### Pro Plan

- **Cost**: $99/month
- **Credits**: 100 API credits per month
- **Credit Usage**: 1 minute of video = 0.2 credits
- **Total**: ~500 minutes of video per month
- **For 1 minute**: 0.2 credits
- **Effective cost per minute**: ~$0.20 (if using all credits)

#### Scale Plan

- **Cost**: $330/month
- **Credits**: 660 API credits per month
- **Credit Usage**: 1 minute of video = 0.2 credits
- **Total**: ~3,300 minutes of video per month
- **For 1 minute**: 0.2 credits
- **Effective cost per minute**: ~$0.10 (if using all credits)

### Streaming API Pricing

The **Streaming API** (real-time text-to-speech) pricing may differ from video generation. Key differences:

1. **Real-time streaming**: Charges are typically based on streaming duration
2. **Session-based**: May charge per session or per minute of streaming
3. **Different tiers**: Streaming API may have separate pricing tiers

**⚠️ Important**:

- Check HeyGen's official pricing page for current streaming API rates
- Streaming API pricing may be different from video generation pricing
- Contact HeyGen support for enterprise pricing if you need high volume

### Cost Estimation Examples

For a typical usage scenario:

- **10 minutes/day** = 300 minutes/month
  - Free Plan: Not enough (need ~60 credits, have 10)
  - Pro Plan: Costs $99/month (uses 60 credits)
  - Cost per minute: ~$0.33

- **5 minutes/day** = 150 minutes/month
  - Free Plan: Not enough (need ~30 credits, have 10)
  - Pro Plan: Costs $99/month (uses 30 credits)
  - Cost per minute: ~$0.66

- **2 minutes/day** = 60 minutes/month
  - Free Plan: Not enough (need ~12 credits, have 10)
  - Pro Plan: Costs $99/month (uses 12 credits)
  - Cost per minute: ~$1.65

### Cost Optimization Tips

1. **Use Free Plan for Testing**: Start with the free plan to test functionality
2. **Batch Requests**: Group multiple text snippets into longer sessions
3. **Cache Common Responses**: Cache frequently used audio/text combinations
4. **Monitor Usage**: Track your API usage to optimize costs
5. **Consider Alternatives**: For static content, pre-generate videos instead of streaming

### Resources

- [HeyGen Pricing Page](https://www.heygen.com/pricing)
- [HeyGen API Pricing Guide](https://help.heygen.com/en/articles/10060327-heygen-api-pricing-subscriptions-explained)
- Contact HeyGen support for custom pricing for high-volume usage

## Limitations

1. **Browser Support**: Requires WebRTC support (modern browsers)
2. **Network**: Requires stable internet connection
3. **API Limits**: Subject to HeyGen API rate limits and pricing tiers
4. **Audio Only**: The streaming API provides audio only (video requires the video player component)
5. **Cost**: Real-time streaming may have different pricing than video generation

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
