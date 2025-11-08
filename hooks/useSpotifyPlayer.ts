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
  // Note: play() method may not be available in all SDK versions
  // To play specific tracks, use the REST API instead
  play?: (options: {
    uris?: string[];
    context_uri?: string;
    offset?: { position?: number; uri?: string };
  }) => Promise<void>;
  // Not always in types; present in SDK for user-gesture activation
  activateElement?: () => Promise<void> | void;
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
  activate: () => Promise<void>;
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
  const activatedRef = useRef(false);

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
      // Create unique device name to avoid conflicts when multiple tabs are open
      const deviceName = `सत्संग भजन प्लेयर ${Date.now().toString().slice(-4)}`;

      const spotifyPlayer = new window.Spotify.Player({
        name: deviceName,
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
        console.log('✅ [Spotify SDK] Device READY - Device ID:', device_id);
        console.log('⚠️ [Spotify SDK] Device is ready but NOT YET ACTIVE in Spotify REST API');
        console.log('⚠️ [Spotify SDK] Device will appear in /v1/me/player/devices only after:');
        console.log('   1. User gesture activates it (activateElement() with click)');
        console.log('   2. OR playback starts on it');
        console.log('   3. OR playback is transferred to it');
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
        // Try to activate element if required (after a user gesture)
        if (!activatedRef.current && playerRef.current.activateElement) {
          try {
            console.log(
              '[Spotify SDK] Attempting to activate device (may fail without user gesture)...'
            );
            await playerRef.current.activateElement();
            activatedRef.current = true;
            console.log('✅ [Spotify SDK] Device activated successfully!');
          } catch (err: any) {
            // Activation may require a user gesture; ignore errors here
            console.warn(
              '⚠️ [Spotify SDK] Device activation failed (expected without user gesture):',
              err?.message || err
            );
          }
        }
        console.log('[Spotify SDK] Connecting to Spotify...');
        const connected = await playerRef.current.connect();
        if (connected) {
          console.log(
            '✅ [Spotify SDK] Connected successfully. Device ID will be available when ready event fires.'
          );
        }
        if (!connected) {
          setError('Failed to connect to Spotify');
        }
      } catch (err) {
        console.error('Error connecting to Spotify:', err);
        setError('Failed to connect to Spotify');
      }
    }
  }, [initializePlayer]);

  // Explicit activation call to be triggered by a user gesture
  const activate = useCallback(async () => {
    if (!playerRef.current) {
      console.warn('[Spotify SDK] Cannot activate: player not initialized');
      return;
    }
    if (activatedRef.current) {
      console.log('[Spotify SDK] Device already activated');
      return;
    }
    if (playerRef.current.activateElement) {
      try {
        console.log('[Spotify SDK] 🔵 Activating device with user gesture...');
        await playerRef.current.activateElement();
        activatedRef.current = true;
        console.log('✅ [Spotify SDK] Device activated! It should now appear in devices list.');

        // Wait a moment and check if device appears in list
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const token = await getAccessToken();
        if (token) {
          try {
            const devicesRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (devicesRes.ok) {
              const devicesData = await devicesRes.json();
              const devices = devicesData.devices || [];
              const ourDevice = devices.find((d: any) => d.id === deviceId);
              if (ourDevice) {
                console.log(
                  '✅ [Spotify SDK] Device confirmed in REST API devices list:',
                  ourDevice.name,
                  'is_active:',
                  ourDevice.is_active
                );
              } else {
                console.warn('⚠️ [Spotify SDK] Device still not in REST API list after activation');
              }
            }
          } catch {
            // Ignore
          }
        }
      } catch (err: any) {
        console.error('[Spotify SDK] Activation failed:', err?.message || err);
        // If activation fails, next user gesture can try again
      }
    } else {
      console.warn('[Spotify SDK] activateElement() method not available');
    }
  }, [deviceId, getAccessToken]);

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
  const checkPremiumStatus = useCallback(async (token: string): Promise<boolean | null> => {
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
        // First, activate the device by transferring playback to it
        // This is required for Web Playback SDK devices to become active
        console.log('Activating device by transferring playback...', currentDeviceId);

        // Retry logic for playing track
        let retries = 5; // Increased retries
        let lastError: Error | null = null;

        while (retries > 0) {
          try {
            // Step 1: Transfer playback to our device (this activates it)
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

            if (transferResponse.status === 404) {
              // No active player - this is okay, we'll try to play directly
              console.log('No active player to transfer from, will play directly');
            } else if (!transferResponse.ok && transferResponse.status !== 204) {
              const errorData = await transferResponse.json().catch(() => ({}));
              console.warn('Device transfer response:', transferResponse.status, errorData);
              // Continue anyway - sometimes 404 is expected
            } else {
              console.log('✅ Device transfer successful');
              // Wait a moment for device to become active
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            // Step 2: Wait for device to appear in Spotify's devices list
            // This is critical - the Web Playback SDK device needs to register with Spotify
            let deviceFoundInList = false;
            let deviceCheckAttempts = 10; // Check up to 10 times (10 seconds)

            while (!deviceFoundInList && deviceCheckAttempts > 0) {
              try {
                const devicesResponse = await fetch(
                  'https://api.spotify.com/v1/me/player/devices',
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                if (devicesResponse.ok) {
                  const devicesData = await devicesResponse.json();
                  const devices = devicesData.devices || [];
                  const ourDevice = devices.find((d: any) => d.id === currentDeviceId);

                  if (ourDevice) {
                    console.log(
                      '✅ Device found in devices list:',
                      ourDevice.name,
                      'is_active:',
                      ourDevice.is_active
                    );
                    deviceFoundInList = true;
                    break;
                  } else {
                    console.log(
                      `Device not in list yet (${devices.length} devices found, ${deviceCheckAttempts} checks left). Other devices:`,
                      devices.map((d: any) => ({
                        id: d.id?.substring(0, 20) + '...',
                        name: d.name,
                        is_active: d.is_active,
                      }))
                    );
                  }
                }
              } catch (checkErr) {
                console.warn('Error checking devices list:', checkErr);
              }

              deviceCheckAttempts--;
              if (!deviceFoundInList && deviceCheckAttempts > 0) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }

            if (!deviceFoundInList) {
              console.warn(
                '⚠️ Device not found in Spotify devices list after waiting. This may cause playback to fail.'
              );
              // Continue anyway - sometimes it works even if not in the list immediately
            }

            // Step 3: Try to play the track
            // First try REST API, then fallback to SDK's play method if device not in list

            // Try REST API first (preferred method)
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
              console.log('✅ Track playing successfully via REST API:', trackId);
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
              // Device not registered with Spotify's REST API yet
              // The Web Playback SDK device needs time to register, OR
              // it requires a user gesture to activate (browser autoplay policy)
              console.warn(`Device not found in REST API (attempt ${6 - retries}/5)`);

              // Try to "wake up" the device by getting its state
              if (playerRef.current) {
                try {
                  const state = await playerRef.current.getCurrentState();
                  if (state) {
                    console.log('Device state retrieved, device is active:', state.device_id);
                  }
                } catch (stateErr) {
                  console.warn('Could not get device state:', stateErr);
                }
              }

              lastError = new Error(
                'Device not registered with Spotify API. This may require a user gesture to activate.'
              );
              retries--;
              if (retries > 0) {
                // Wait longer between retries to give device time to register
                console.log(`Waiting 3 seconds before retry (${retries} attempts left)...`);
                await new Promise((resolve) => setTimeout(resolve, 3000));
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
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }
        }

        // All retries failed
        if (lastError) {
          console.error('All play attempts failed:', lastError);
          setError(
            'Unable to play track automatically. The Spotify Web Playback SDK requires a user gesture (click) to activate. Please click the Play button to start playback.'
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

  // When player becomes ready, wait a moment then try to activate device
  // The device needs time to register with Spotify's servers
  useEffect(() => {
    (async () => {
      if (!isReady || !deviceId) return;
      const token = await getAccessToken();
      if (!token) return;

      // Wait a bit for device to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        console.log('[useSpotifyPlayer] Device ready, activating device:', deviceId);

        // Try to transfer playback to activate the device
        const res = await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_ids: [deviceId], play: false }), // Just transfer, don't play
        });

        if (res.ok || res.status === 204) {
          console.log('[useSpotifyPlayer] ✅ Device activated successfully');
        } else if (res.status === 404) {
          // No active player - this is normal for first connection
          // The device should still work, it just means there's nothing to transfer from
          console.log('[useSpotifyPlayer] No active player to transfer from (this is normal)');
        } else {
          // Non-fatal
          try {
            const data = await res.json();
            console.warn('[useSpotifyPlayer] Initial transfer warning:', res.status, data);
          } catch {
            console.warn('[useSpotifyPlayer] Initial transfer warning:', res.status);
          }
        }

        // Wait a bit more and check if device appears in list
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          const devicesRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (devicesRes.ok) {
            const devicesData = await devicesRes.json();
            const devices = devicesData.devices || [];
            const ourDevice = devices.find((d: any) => d.id === deviceId);
            if (ourDevice) {
              console.log(
                '[useSpotifyPlayer] ✅ Device confirmed in devices list:',
                ourDevice.name
              );
            } else {
              console.log('[useSpotifyPlayer] ⚠️ Device not yet in devices list (may take longer)');
            }
          }
        } catch {
          // Ignore - just for logging
        }
      } catch (e) {
        console.warn('[useSpotifyPlayer] Error during initial device activation:', e);
      }
    })();
  }, [isReady, deviceId, getAccessToken]);

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
    activate,
  };
}
