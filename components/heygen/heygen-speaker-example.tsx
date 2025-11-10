'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { useHeygenTextToSpeech } from '@/hooks/useHeygenTextToSpeech';

/**
 * Example component demonstrating how to use HeyGen avatar for text-to-speech
 * This component allows users to enter any text and have the avatar speak it
 */
export function HeygenSpeakerExample() {
  const [text, setText] = useState('नमस्ते! मैं आपका आध्यात्मिक गुरु हूं।');
  const { speak, isReady, isSpeaking, error } = useHeygenTextToSpeech({
    avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID,
    autoStart: false, // Initialize on first speak
  });

  const handleSpeak = async () => {
    if (!text.trim()) {
      alert('Please enter some text to speak');
      return;
    }

    try {
      await speak(text);
    } catch (err) {
      console.error('Error speaking:', err);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-lg border p-6">
      <h2 className="text-2xl font-bold">HeyGen Avatar Text-to-Speech</h2>
      <p className="text-muted-foreground text-sm">
        Enter any text below and the HeyGen avatar will speak it in real-time.
      </p>

      <div className="space-y-2">
        <label htmlFor="text-input" className="text-sm font-medium">
          Text to Speak
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text here..."
          className="w-full rounded-md border p-2"
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSpeak}
          disabled={!isReady || isSpeaking || !text.trim()}
          variant="default"
        >
          {isSpeaking ? '🔊 Speaking...' : '🎤 Speak'}
        </Button>

        {error && (
          <div className="text-destructive text-sm">
            Error: {error.message}
          </div>
        )}
      </div>

      <div className="text-muted-foreground text-xs">
        Status: {isReady ? '✅ Ready' : '⏳ Initializing...'}
      </div>
    </div>
  );
}

