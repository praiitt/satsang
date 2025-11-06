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

  // Check Premium status
  const checkPremiumStatus = useCallback(
    async (token: string): Promise<boolean | null> => {
      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return null;
        }

        const userData = await response.json();
        // Spotify API doesn't directly expose Premium status, but we can infer from product field
        // product can be 'premium', 'free', 'open', 'unlimited'
        const product = userData.product?.toLowerCase();
        console.log('Spotify user product:', product);
        return product === 'premium';
      } catch (err) {
        console.error('Error checking Premium status:', err);
        return null;
      }
    },
    []
  );

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
      if (!currentDeviceId || !isReady) {
        // Ensure player is connected
        if (!playerRef.current) {
          await initializePlayer();
        }
        if (playerRef.current) {
          const connected = await playerRef.current.connect();
          if (!connected) {
            setError('Failed to connect to Spotify player');
            return;
          }
        }

        // Wait for device to be ready (with retries)
        let retries = 15; // Increased retries (15 seconds)
        while ((!currentDeviceId || !isReady) && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (playerRef.current) {
            try {
              const state = await playerRef.current.getCurrentState();
              if (state?.device_id) {
                currentDeviceId = state.device_id;
                setDeviceId(state.device_id);
                if (isReady) break;
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

      // Ensure player is still connected
      if (playerRef.current) {
        try {
          const connected = await playerRef.current.connect();
          if (!connected) {
            console.warn('Player not connected, attempting to reconnect...');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (connectErr) {
          console.warn('Error checking connection:', connectErr);
        }
      }

      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated with Spotify');
        return;
      }

      // Check Premium status
      const isPremium = await checkPremiumStatus(token);
      if (isPremium === false) {
        setError('Spotify Premium is required for full track playback via Web Playback SDK.');
        return;
      }

      try {
        // First, verify the device is registered with Spotify by checking devices endpoint
        console.log('Checking if device is registered with Spotify...');
        let deviceRegistered = false;
        let deviceCheckRetries = 10; // Check up to 10 times (10 seconds)

        while (!deviceRegistered && deviceCheckRetries > 0) {
          try {
            const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (devicesResponse.ok) {
              const devicesData = await devicesResponse.json();
              const devices = devicesData.devices || [];
              const ourDevice = devices.find((d: any) => d.id === currentDeviceId);

              if (ourDevice) {
                console.log('✅ Device is registered with Spotify:', ourDevice.name);
                deviceRegistered = true;
                break;
              } else {
                console.log(
                  `Device not found in Spotify devices list (${devices.length} devices found), waiting... (${deviceCheckRetries} checks left)`
                );
              }
            }
          } catch (checkErr) {
            console.warn('Error checking devices:', checkErr);
          }

          deviceCheckRetries--;
          if (!deviceRegistered && deviceCheckRetries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!deviceRegistered) {
          console.warn('Device not found in Spotify devices list after waiting');
          // Continue anyway - sometimes it works even if not in the list
        }

        // Retry logic for playing track
        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0) {
          try {
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
                  play: false,
                }),
              });

              if (transferResponse.status === 404) {
                console.log('No active player to transfer from, continuing with direct play');
              } else if (!transferResponse.ok && transferResponse.status !== 204) {
                const errorData = await transferResponse.json().catch(() => ({}));
                console.warn('Device transfer warning:', errorData);
              }
            } catch (transferErr) {
              console.warn('Device transfer failed (non-critical):', transferErr);
            }

            // Play the track directly on our device via REST API
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

            if (playResponse.ok || playResponse.status === 204) {
              console.log('Track playing successfully via REST API:', trackId);
              setError(null);
              return; // Success!
            }

            const errorData = await playResponse.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || 'Failed to play track';

            if (playResponse.status === 403) {
              setError(
                'Spotify Premium required. Web Playback SDK requires a Spotify Premium subscription.'
              );
              throw new Error(errorMessage);
            } else if (playResponse.status === 404) {
              // Device not ready yet, retry
              console.warn(
                `Device not found (attempt ${4 - retries}/3), waiting and retrying...`
              );
              lastError = new Error(errorMessage);
              retries--;
              if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
              }
            } else if (playResponse.status === 401) {
              setError('Authentication expired. Please reconnect to Spotify.');
              throw new Error(errorMessage);
            } else {
              setError(errorMessage || `Failed to play track (${playResponse.status})`);
              throw new Error(errorMessage);
            }
          } catch (err: any) {
            if (err.message && err.message.includes('Network')) {
              throw err; // Don't retry network errors
            }
            lastError = err;
            retries--;
            if (retries > 0) {
              console.warn(`Play attempt failed, retrying... (${retries} attempts left)`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }

        // All retries failed
        if (lastError) {
          console.error('All play attempts failed:', lastError);
          setError(
            'Device not ready after multiple attempts. The Web Playback SDK device may need more time to initialize. Please wait a moment and try requesting the bhajan again.'
          );
          throw lastError;
        }
      } catch (err: any) {
        console.error('Error playing track:', err);
        if (!err.message || err.message === 'Failed to fetch') {
          setError('Network error. Please check your connection.');
        } else if (err.message && !err.message.includes('Spotify Premium')) {
          // Don't override the error message if it's already set
          if (!err.message.includes('Device not ready after multiple attempts')) {
            setError(err.message);
          }
        }
      }
    },
    [deviceId, connect, initializePlayer, getAccessToken, checkPremiumStatus]
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
