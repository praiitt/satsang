'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const FREE_TRIAL_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const STORAGE_KEY = 'satsang_session_start_time';

interface UseSessionTimerReturn {
  timeRemaining: number; // milliseconds remaining
  isTrialExpired: boolean;
  minutesRemaining: number;
  secondsRemaining: number;
  resetTimer: () => void;
}

/**
 * Hook to track session time for free trial
 * Tracks time from when session starts until 15 minutes elapse
 */
export function useSessionTimer(isSessionActive: boolean): UseSessionTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(FREE_TRIAL_DURATION_MS);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Initialize or get session start time
  useEffect(() => {
    if (isSessionActive) {
      // Get or set session start time
      const stored = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (stored) {
        const startTime = parseInt(stored, 10);
        const elapsed = now - startTime;
        const remaining = Math.max(0, FREE_TRIAL_DURATION_MS - elapsed);

        startTimeRef.current = startTime;
        setTimeRemaining(remaining);
      } else {
        // First time starting session
        localStorage.setItem(STORAGE_KEY, now.toString());
        startTimeRef.current = now;
        setTimeRemaining(FREE_TRIAL_DURATION_MS);
      }
    } else {
      // Session ended - clear timer but keep start time for potential resume
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isSessionActive]);

  // Update timer every second
  useEffect(() => {
    if (isSessionActive && startTimeRef.current !== null) {
      // Initial check
      const checkTime = () => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current!;
        const remaining = Math.max(0, FREE_TRIAL_DURATION_MS - elapsed);
        setTimeRemaining(remaining);
        return remaining;
      };

      // Check immediately
      const initialRemaining = checkTime();

      // If already expired, don't set up interval
      if (initialRemaining === 0) {
        return;
      }

      intervalRef.current = setInterval(() => {
        const remaining = checkTime();
        if (remaining === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isSessionActive]);

  const resetTimer = useCallback(() => {
    // Clear stored time and reset
    localStorage.removeItem(STORAGE_KEY);
    startTimeRef.current = null;
    setTimeRemaining(FREE_TRIAL_DURATION_MS);
  }, []);

  // Ensure we calculate expiration correctly
  const isTrialExpired = timeRemaining <= 0;
  const minutesRemaining = Math.floor(timeRemaining / 60000);
  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isTrialExpired) {
      console.log('[SessionTimer] Trial expired!', {
        timeRemaining,
        isTrialExpired,
        minutesRemaining,
        secondsRemaining,
      });
    }
  }, [isTrialExpired, timeRemaining, minutesRemaining, secondsRemaining]);

  return {
    timeRemaining,
    isTrialExpired,
    minutesRemaining,
    secondsRemaining,
    resetTimer,
  };
}
