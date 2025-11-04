'use client';

import { useEffect, useState } from 'react';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

export function SpotifyAuthButton() {
  const { isAuthenticated, connect } = useSpotifyPlayer();
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication status on mount (only once)
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/spotify/token');
        if (!cancelled && response.ok) {
          // User is authenticated, try to connect
          await connect();
        }
      } catch {
        // Not authenticated - expected if user hasn't connected
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleAuth = () => {
    // Redirect to Spotify auth endpoint
    window.location.href = '/api/spotify/auth';
  };

  if (isChecking) {
    return null; // Don't show button while checking
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-1.5 text-sm text-green-300">
        <span>✓</span>
        <span>Spotify Connected</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleAuth}
      className="flex items-center gap-2 rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95"
      title="Connect to Spotify for full bhajan playback"
    >
      <svg
        className="h-5 w-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
      <span>Connect Spotify</span>
    </button>
  );
}
