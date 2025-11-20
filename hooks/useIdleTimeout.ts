import { useCallback, useEffect, useRef } from 'react';
import { LocalTrackPublication, Track } from 'livekit-client';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { toastAlert } from '@/components/livekit/alert-toast';
import { useChatMessages } from './useChatMessages';

/**
 * Hook to disconnect the room after a period of user inactivity.
 * Monitors:
 * - Microphone audio activity
 * - Chat messages sent by user
 * - User interactions (clicks, keyboard, touch)
 *
 * @param idleTimeoutMs - Time in milliseconds before disconnecting (default: 15 minutes)
 * @param enabled - Whether idle timeout is enabled (default: true)
 */
export function useIdleTimeout(
  idleTimeoutMs: number = 15 * 60 * 1000, // 15 minutes default
  enabled: boolean = true
) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const messages = useChatMessages();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousMessageCountRef = useRef<number>(0);

  // Helper: check if agent is in explicit "sleep" mode (e.g., while bhajans are playing)
  // We store this flag on window in useAgentControl so all hooks can read it.
  const isAgentSleeping = () => {
    if (typeof window === 'undefined') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__agentIsSleeping === true;
  };

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (!enabled || room.state === 'disconnected') {
      return;
    }

    lastActivityRef.current = Date.now();

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // If the agent is intentionally sleeping (e.g., while YouTube bhajan is playing),
      // do NOT disconnect the room. Instead, quietly reset the idle timer so that
      // long bhajan/vani playback sessions don't get cut off.
      if (isAgentSleeping()) {
        console.log(
          '[IdleTimeout] Agent is sleeping (bhajan/vani playing); skipping disconnect and resetting timer'
        );
        resetIdleTimer();
        return;
      }

      if (room.state !== 'disconnected') {
        console.log(
          `[IdleTimeout] Disconnecting due to ${idleTimeoutMs / 1000 / 60} minutes of inactivity`
        );

        toastAlert({
          title: 'Session ended',
          description: `आप ${Math.round(idleTimeoutMs / 1000 / 60)} मिनट से निष्क्रिय थे, इसलिए कनेक्शन बंद कर दिया गया।`,
        });

        room.disconnect();
      }
    }, idleTimeoutMs);
  }, [room, idleTimeoutMs, enabled]);

  // Monitor microphone audio activity
  useEffect(() => {
    if (!enabled || room.state === 'disconnected') {
      return;
    }

    // Get microphone track publication
    const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone) as
      | LocalTrackPublication
      | undefined;
    const micTrack = micPublication?.track;

    if (!micTrack || !(micTrack instanceof MediaStreamTrack)) {
      // Microphone not available yet, skip audio monitoring
      return;
    }

    // Create audio context to analyze audio levels
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(new MediaStream([micTrack]));
      source.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      let lastAudioActivity = Date.now();
      const AUDIO_THRESHOLD = 10; // Minimum audio level to consider as activity
      const AUDIO_CHECK_INTERVAL = 1000; // Check every second

      const checkAudioActivity = () => {
        if (room.state === 'disconnected' || !analyser) {
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;

        // If audio level is above threshold, user is speaking
        if (average > AUDIO_THRESHOLD) {
          const now = Date.now();
          // Only reset timer if audio activity is new (not continuous)
          if (now - lastAudioActivity > AUDIO_CHECK_INTERVAL) {
            console.log(`[IdleTimeout] Audio activity detected (level: ${average.toFixed(2)})`);
            resetIdleTimer();
          }
          lastAudioActivity = now;
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioActivity);
      };

      checkAudioActivity();
    } catch (error) {
      console.warn('[IdleTimeout] Failed to set up audio monitoring:', error);
      // Continue without audio monitoring - will still monitor chat and interactions
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [room, localParticipant, enabled, resetIdleTimer]);

  // Monitor chat messages (user sending messages)
  useEffect(() => {
    if (!enabled || room.state === 'disconnected') {
      return;
    }

    // Check if user sent a new message (messages from local participant)
    const userMessages = messages.filter((msg) => msg.from?.isLocal === true);
    const currentMessageCount = userMessages.length;

    if (currentMessageCount > previousMessageCountRef.current) {
      console.log('[IdleTimeout] Chat message activity detected');
      resetIdleTimer();
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, enabled, resetIdleTimer, room]);

  // Monitor user interactions (clicks, keyboard, touch)
  useEffect(() => {
    if (!enabled || room.state === 'disconnected') {
      return;
    }

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    // Listen to various user interaction events
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [enabled, resetIdleTimer, room]);

  // Initialize timer when session starts
  useEffect(() => {
    if (!enabled || room.state === 'disconnected') {
      return;
    }

    // Start timer when room is connected
    if (room.state === 'connected') {
      console.log(`[IdleTimeout] Starting idle timeout (${idleTimeoutMs / 1000 / 60} minutes)`);
      resetIdleTimer();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [room.state, enabled, resetIdleTimer, idleTimeoutMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
}
