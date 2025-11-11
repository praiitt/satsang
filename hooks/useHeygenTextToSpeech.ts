'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HeygenSession {
  session_id: string;
  url: string;
  access_token: string;
  session_token: string;
}

interface UseHeygenTextToSpeechOptions {
  avatarId?: string; // Photo avatar ID from HeyGen
  autoStart?: boolean; // Auto-start session on mount
  onError?: (error: Error) => void;
}

interface UseHeygenTextToSpeechReturn {
  isReady: boolean;
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  error: Error | null;
}

/**
 * Hook to use HeyGen photo avatar for text-to-speech
 *
 * @param options Configuration options
 * @returns Object with speak function and state
 *
 * @example
 * ```tsx
 * const { speak, isReady } = useHeygenTextToSpeech({
 *   avatarId: 'your-avatar-id',
 * });
 *
 * // Later, speak any text:
 * await speak('नमस्ते! मैं आपका आध्यात्मिक गुरु हूं।');
 * ```
 */
export function useHeygenTextToSpeech(
  options: UseHeygenTextToSpeechOptions = {}
): UseHeygenTextToSpeechReturn {
  const { avatarId, autoStart = false, onError } = options;
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sessionRef = useRef<HeygenSession | null>(null);
  const isInitializingRef = useRef(false);

  // Initialize HeyGen session
  const initializeSession = useCallback(async () => {
    if (isInitializingRef.current || sessionRef.current) {
      return;
    }

    try {
      isInitializingRef.current = true;
      setError(null);

      // Create new session with avatar ID
      const response = await fetch('/api/heygen/session/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_id: avatarId || process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create HeyGen session');
      }

      const data = await response.json();
      sessionRef.current = {
        session_id: data.session_id,
        url: data.url,
        access_token: data.access_token,
        session_token: data.session_token,
      };

      // Start the session
      await fetch('/api/heygen/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionRef.current.session_id,
          session_token: sessionRef.current.session_token,
        }),
      });

      setIsReady(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      setIsReady(false);
    } finally {
      isInitializingRef.current = false;
    }
  }, [avatarId, onError]);

  // Speak text using the avatar
  const speak = useCallback(
    async (text: string) => {
      if (!sessionRef.current) {
        // Initialize session if not already done
        await initializeSession();
      }

      if (!sessionRef.current) {
        throw new Error('HeyGen session not initialized');
      }

      try {
        setIsSpeaking(true);
        setError(null);

        const response = await fetch('/api/heygen/session/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionRef.current.session_id,
            session_token: sessionRef.current.session_token,
            text,
            task_type: 'talk',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to speak text');
        }

        // Note: In a real implementation, you might want to track when speaking completes
        // For now, we'll set isSpeaking to false after a delay
        // You could also poll the session status or use WebSocket events
        setTimeout(() => {
          setIsSpeaking(false);
        }, 1000);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
        setIsSpeaking(false);
        throw error;
      }
    },
    [initializeSession, onError]
  );

  // Stop speaking
  const stop = useCallback(async () => {
    if (!sessionRef.current) {
      return;
    }

    try {
      await fetch('/api/heygen/session/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionRef.current.session_id,
          session_token: sessionRef.current.session_token,
        }),
      });

      setIsSpeaking(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    }
  }, [onError]);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoStart) {
      initializeSession();
    }

    // Cleanup on unmount
    return () => {
      if (sessionRef.current) {
        stop().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [autoStart, initializeSession, stop]);

  return {
    isReady,
    isSpeaking,
    speak,
    stop,
    error,
  };
}
