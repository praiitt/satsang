'use client';

import { useEffect } from 'react';

// Keeps the screen awake during an active session using the Wake Lock API.
// Silently no-ops on unsupported browsers.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let sentinel: any | undefined;

    const requestWakeLock = async () => {
      try {
        if (typeof navigator !== 'undefined' && typeof document !== 'undefined') {
          const nav = navigator as unknown as {
            wakeLock?: { request: (type: 'screen') => Promise<unknown> };
          };
          if (nav.wakeLock && document.visibilityState === 'visible') {
            sentinel = await nav.wakeLock.request('screen');
          }
        }
      } catch {
        // ignore errors; failures are non-fatal
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try {
        if (sentinel && !sentinel.released) {
          void sentinel.release();
        }
      } catch {
        // ignore
      }
    };
  }, [enabled]);
}


