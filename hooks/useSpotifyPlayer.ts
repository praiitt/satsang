'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Spotify Web Playback SDK types
interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (state: any) => void) => void;
  removeListener: (event: string, callback: (state: any) => void) => void;
  getCurrentState: () => Promise<any>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  play: (options: {
    uris?: string[];
    context_uri?: string;
    offset?: { position?: number; uri?: string };
  }) => Promise<void>;
}

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface UseSpotifyPlayerReturn {
  player: SpotifyPlayer | null;
  isReady: boolean;
  isAuthenticated: boolean;
  deviceId: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  playTrack: (trackId: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  isPlaying: boolean;
}

export function useSpotifyPlayer(): UseSpotifyPlayerReturn {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load Spotify Web Playback SDK script
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    // Check if SDK is already loaded
    if (window.Spotify) {
      scriptLoadedRef.current = true;
      return;
    }

    // Set up ready callback
    window.onSpotifyWebPlaybackSDKReady = () => {
      scriptLoadedRef.current = true;
      console.log('Spotify Web Playback SDK ready');
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    script.onload = () => {
      // SDK will call onSpotifyWebPlaybackSDKReady when ready
      if (window.Spotify && !scriptLoadedRef.current) {
        window.onSpotifyWebPlaybackSDKReady();
      }
    };

    script.onerror = () => {
      console.error('Failed to load Spotify Web Playback SDK');
      setError('Failed to load Spotify SDK');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script if needed
    };
  }, []);

  // Cache token to avoid repeated API calls
  const tokenCacheRef = useRef<{
    token: string | null;
    timestamp: number;
  } | null>(null);
  const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get access token from API
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Return cached token if still valid
    if (
      tokenCacheRef.current &&
      Date.now() - tokenCacheRef.current.timestamp < TOKEN_CACHE_DURATION
    ) {
      return tokenCacheRef.current.token;
    }

    try {
      const response = await fetch('/api/spotify/token');
      if (!response.ok) {
        // If 401, user needs to authenticate
        if (response.status === 401) {
          setError('Spotify authentication required');
          setIsAuthenticated(false);
        }
        tokenCacheRef.current = { token: null, timestamp: Date.now() };
        return null;
      }
      const data = await response.json();
      const token = data.access_token || null;
      tokenCacheRef.current = { token, timestamp: Date.now() };
      // Clear error if we successfully got a token
      if (token) {
        setError(null);
      }
      return token;
    } catch (err) {
      // Only log errors, don't spam console
      if (tokenCacheRef.current?.token === null) {
        // Only log if we don't have a cached null (to avoid spam)
        return null;
      }
      tokenCacheRef.current = { token: null, timestamp: Date.now() };
      return null;
    }
  }, []);

  // Initialize player
  const initializePlayer = useCallback(async () => {
    if (!window.Spotify || playerRef.current) return;

    const token = await getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsAuthenticated(true);

    try {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Satsang Bhajan Player',
        getOAuthToken: async (cb) => {
          const accessToken = await getAccessToken();
          if (accessToken) {
            cb(accessToken);
          }
        },
        volume: 0.8,
      });

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Spotify initialization error:', message);
        setError(message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Spotify authentication error:', message);
        setError(message);
        setIsAuthenticated(false);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        setError(message);
        // This usually means Premium is required
        if (message.toLowerCase().includes('premium')) {
          setError('Spotify Premium is required for full track playback');
        }
      });

      spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
        setError(message);
      });

      // Ready state
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Spotify player ready, device ID:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        setError(null);
      });

      // Not ready state
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify player not ready, device ID:', device_id);
        setIsReady(false);
      });

      // Playback state
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
      });

      playerRef.current = spotifyPlayer;
      setPlayer(spotifyPlayer);
    } catch (err) {
      console.error('Error initializing Spotify player:', err);
      setError('Failed to initialize Spotify player');
    }
  }, [getAccessToken]);

  // Connect player
  const connect = useCallback(async () => {
    if (!playerRef.current) {
      await initializePlayer();
    }

    if (playerRef.current) {
      try {
        const connected = await playerRef.current.connect();
        if (!connected) {
          setError('Failed to connect to Spotify');
        }
      } catch (err) {
        console.error('Error connecting to Spotify:', err);
        setError('Failed to connect to Spotify');
      }
    }
  }, [initializePlayer]);

  // Disconnect player
  const disconnect = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
      setPlayer(null);
      setIsReady(false);
      setDeviceId(null);
    }
  }, []);

  // Play track
  const playTrack = useCallback(
    async (trackId: string) => {
      // Ensure player is initialized and connected
      if (!playerRef.current) {
        await initializePlayer();
      }

      if (!playerRef.current) {
        setError('Spotify player not initialized');
        return;
      }

      // Connect if not already connected
      let currentDeviceId = deviceId;
      if (!currentDeviceId) {
        await connect();
        // Wait for device to be ready (with retries)
        // Check playerRef.current.device_id or wait for state update
        let retries = 5;
        while (!currentDeviceId && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          // Re-check deviceId from state (this will be updated by the ready event)
          // We'll use a different approach - check if player is ready
          if (playerRef.current) {
            try {
              const state = await playerRef.current.getCurrentState();
              if (state?.device_id) {
                currentDeviceId = state.device_id;
                setDeviceId(state.device_id);
              }
            } catch {
              // Not ready yet
            }
          }
          retries--;
        }
      }

      if (!currentDeviceId) {
        setError('Spotify device not ready. Please wait a moment and try again.');
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated with Spotify');
        return;
      }

      try {
        // Wait a bit for device to be fully ready
        await new Promise((resolve) => setTimeout(resolve, 500));

        // First, try to transfer to our device (optional - only if there's an active player)
        try {
          const transferResponse = await fetch(`https://api.spotify.com/v1/me/player`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              device_ids: [currentDeviceId],
              play: false, // Don't play yet, just transfer
            }),
          });

          // 404 is OK here - means no active player to transfer from
          if (transferResponse.status === 404) {
            console.log('No active player to transfer from, continuing with direct play');
          } else if (!transferResponse.ok && transferResponse.status !== 204) {
            const errorData = await transferResponse.json().catch(() => ({}));
            console.warn('Device transfer warning:', errorData);
          }
        } catch (transferErr) {
          // Transfer is optional, continue with direct play
          console.warn('Device transfer failed (non-critical):', transferErr);
        }

        // Play the track directly on our device
        const playResponse = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uris: [`spotify:track:${trackId}`],
            }),
          }
        );

        if (!playResponse.ok) {
          const errorData = await playResponse.json().catch(() => ({}));
          const errorMessage = errorData?.error?.message || 'Failed to play track';

          if (playResponse.status === 403) {
            setError(
              'Spotify Premium required. Web Playback SDK requires a Spotify Premium subscription.'
            );
          } else if (playResponse.status === 404) {
            // Device might not be ready yet, try waiting a bit more
            console.warn('Device not found, might need more time to initialize');
            setError(
              'Device not ready. Please ensure you have Spotify Premium and try again in a moment.'
            );
          } else if (playResponse.status === 401) {
            setError('Authentication expired. Please reconnect to Spotify.');
          } else {
            setError(errorMessage || `Failed to play track (${playResponse.status})`);
          }
          throw new Error(errorMessage);
        }

        console.log('Track playing successfully:', trackId);
        setError(null);
      } catch (err: any) {
        console.error('Error playing track:', err);
        if (!err.message || err.message === 'Failed to fetch') {
          setError('Network error. Please check your connection.');
        } else if (err.message && !err.message.includes('Spotify Premium')) {
          // Don't override premium error message
          setError(err.message);
        }
      }
    },
    [deviceId, connect, initializePlayer, getAccessToken]
  );

  // Pause
  const pause = useCallback(async () => {
    if (playerRef.current) {
      try {
        await playerRef.current.pause();
      } catch (err) {
        console.error('Error pausing:', err);
      }
    }
  }, []);

  // Resume
  const resume = useCallback(async () => {
    if (playerRef.current) {
      try {
        await playerRef.current.resume();
      } catch (err) {
        console.error('Error resuming:', err);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    player,
    isReady,
    isAuthenticated,
    deviceId,
    error,
    connect,
    disconnect,
    playTrack,
    pause,
    resume,
    isPlaying,
  };
}
