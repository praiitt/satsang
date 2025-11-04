'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toastAlert } from '@/components/livekit/alert-toast';

interface SpotifyPlayerProps {
  trackId: string | null;
  trackName?: string;
  artist?: string;
  onPlaybackEnded?: () => void;
}

interface SpotifyPlayerState {
  isPlaying: boolean;
  position: number;
  duration: number;
  deviceId: string | null;
  player: Spotify.Player | null;
}

// Type definitions are in types/spotify.d.ts

export function SpotifyPlayer({
  trackId,
  trackName,
  artist,
  onPlaybackEnded,
}: SpotifyPlayerProps) {
  const [state, setState] = useState<SpotifyPlayerState>({
    isPlaying: false,
    position: 0,
    duration: 0,
    deviceId: null,
    player: null,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Spotify SDK script
  useEffect(() => {
    if (document.getElementById('spotify-sdk')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById('spotify-sdk');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Get Spotify access token
  const getSpotifyToken = useCallback(async () => {
    if (tokenRef.current) {
      return tokenRef.current;
    }

    try {
      // Get token from API endpoint (you'll need to create this)
      const response = await fetch('/api/spotify/token', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to get Spotify token');
      }

      const data = await response.json();
      tokenRef.current = data.access_token;
      return data.access_token;
    } catch (error) {
      console.error('Error getting Spotify token:', error);
      toastAlert({
        title: 'Spotify Authentication Error',
        description: 'Please connect your Spotify account to play bhajans.',
      });
      return null;
    }
  }, []);

  // Initialize Spotify Player
  const initializePlayer = useCallback(async () => {
    if (state.player || !window.Spotify) {
      return;
    }

    const token = await getSpotifyToken();
    if (!token) {
      return;
    }

    setIsLoading(true);

    const player = new window.Spotify.Player({
      name: 'Satsang Bhajan Player',
      getOAuthToken: (cb) => {
        cb(token);
      },
      volume: 0.5,
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify initialization error:', message);
      toastAlert({
        title: 'Spotify Player Error',
        description: message,
      });
      setIsLoading(false);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify authentication error:', message);
      toastAlert({
        title: 'Spotify Authentication Error',
        description: 'Please reconnect your Spotify account.',
      });
      setIsAuthenticated(false);
      setIsLoading(false);
      tokenRef.current = null;
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Spotify account error:', message);
      toastAlert({
        title: 'Spotify Account Error',
        description: 'Spotify Premium is required for playback.',
      });
      setIsLoading(false);
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready with device ID:', device_id);
      setState((prev) => ({ ...prev, deviceId: device_id, player }));
      setIsAuthenticated(true);
      setIsLoading(false);
    });

    // Not ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify player not ready:', device_id);
      setIsAuthenticated(false);
    });

    // Playback state changes
    player.addListener('player_state_changed', (state) => {
      if (!state) {
        return;
      }

      setState((prev) => ({
        ...prev,
        isPlaying: !state.paused,
        position: state.position,
        duration: state.duration,
      }));

      // Check if track ended
      if (state.paused && state.position === 0 && prev.isPlaying) {
        onPlaybackEnded?.();
      }
    });

    // Connect to the player
    player.connect();

    return () => {
      player.disconnect();
    };
  }, [state.player, getSpotifyToken, onPlaybackEnded]);

  // Initialize when SDK is ready
  useEffect(() => {
    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        initializePlayer();
      };
    }
  }, [initializePlayer]);

  // Play track when trackId changes
  useEffect(() => {
    if (!state.player || !state.deviceId || !trackId) {
      return;
    }

    const playTrack = async () => {
      try {
        const token = await getSpotifyToken();
        if (!token) {
          return;
        }

        setIsLoading(true);

        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              uris: [`spotify:track:${trackId}`],
            }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to play track');
        }

        setIsLoading(false);
        if (trackName) {
          toastAlert({
            title: 'Playing Bhajan',
            description: `${trackName}${artist ? ` by ${artist}` : ''}`,
          });
        }
      } catch (error) {
        console.error('Error playing track:', error);
        toastAlert({
          title: 'Playback Error',
          description:
            error instanceof Error ? error.message : 'Failed to play bhajan',
        });
        setIsLoading(false);
      }
    };

    playTrack();
  }, [state.player, state.deviceId, trackId, trackName, artist, getSpotifyToken]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (state.player) {
        state.player.disconnect();
      }
    };
  }, [state.player]);

  // Don't render anything visible - this is a background player
  return null;
}

