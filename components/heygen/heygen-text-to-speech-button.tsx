'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { useHeygenTextToSpeech } from '@/hooks/useHeygenTextToSpeech';

interface HeygenTextToSpeechButtonProps {
  avatarId?: string;
  text: string;
  className?: string;
  disabled?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Button component that uses HeyGen avatar to speak text
 *
 * @example
 * ```tsx
 * <HeygenTextToSpeechButton
 *   avatarId="your-avatar-id"
 *   text="नमस्ते! मैं आपका आध्यात्मिक गुरु हूं।"
 *   onSpeakStart={() => console.log('Started speaking')}
 *   onSpeakEnd={() => console.log('Finished speaking')}
 * />
 * ```
 */
export function HeygenTextToSpeechButton({
  avatarId,
  text,
  className,
  disabled = false,
  onSpeakStart,
  onSpeakEnd,
  onError,
}: HeygenTextToSpeechButtonProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isReady, isSpeaking, speak, error } = useHeygenTextToSpeech({
    avatarId,
    autoStart: false,
    onError,
  });

  const handleClick = async () => {
    try {
      if (!isInitialized) {
        // Initialize session on first click
        setIsInitialized(true);
        // Wait a bit for session to be ready
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      onSpeakStart?.();
      await speak(text);
      onSpeakEnd?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  if (error) {
    return (
      <Button disabled className={className} variant="outline">
        Error: {error.message}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isSpeaking || (!isReady && isInitialized)}
      className={className}
      variant={isSpeaking ? 'secondary' : 'default'}
    >
      {isSpeaking ? '🔊 Speaking...' : '🎤 Speak Text'}
    </Button>
  );
}
