'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// YouTube IFrame Player API types
interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId?: string;
          width?: number;
          height?: number;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            disablekb?: 0 | 1;
            enablejsapi?: 0 | 1;
            fs?: 0 | 1;
            iv_load_policy?: 1 | 3;
            modestbranding?: 0 | 1;
            playsinline?: 0 | 1;
            rel?: 0 | 1;
            showinfo?: 0 | 1;
            start?: number;
            mute?: 0 | 1;
            loop?: 0 | 1;
            playlist?: string;
          };
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerReturn {
  player: YouTubePlayer | null;
  isReady: boolean;
  error: string | null;
  isPlaying: boolean;
  currentVideoId: string | null;
  playVideo: (videoId: string, startSeconds?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => void;
  retry: () => void;
}

export function useYouTubePlayer(): UseYouTubePlayerReturn {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);
  const playerIdRef = useRef(`youtube-player-${Date.now()}`);
  const pendingVideoRef = useRef<{ videoId: string; startSeconds: number } | null>(null);
  const apiLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  const API_LOAD_TIMEOUT = 20000; // 20 seconds
  const wasPlayingBeforeHiddenRef = useRef(false); // Track if video was playing before tab hidden
  const backgroundResumeIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for background resume checks

  // Validate YouTube API structure
  const validateYouTubeAPI = useCallback((): { valid: boolean; error?: string } => {
    try {
      // Check if YT object exists
      if (!window.YT) {
        return { valid: false, error: 'YouTube API (YT) object not found' };
      }

      // Check if Player constructor exists
      if (!window.YT.Player) {
        return { valid: false, error: 'YouTube API Player constructor not found' };
      }

      // Check if PlayerState exists
      if (!window.YT.PlayerState) {
        return { valid: false, error: 'YouTube API PlayerState not found' };
      }

      // Validate PlayerState constants
      const requiredStates = ['UNSTARTED', 'ENDED', 'PLAYING', 'PAUSED', 'BUFFERING', 'CUED'];
      for (const state of requiredStates) {
        if (typeof window.YT.PlayerState[state as keyof typeof window.YT.PlayerState] !== 'number') {
          return { valid: false, error: `YouTube API PlayerState.${state} is invalid` };
        }
      }

      // Try to verify Player is a constructor
      if (typeof window.YT.Player !== 'function') {
        return { valid: false, error: 'YouTube API Player is not a constructor function' };
      }

      console.log('[YouTubePlayer] ✅ API validation passed');
      return { valid: true };
    } catch (err) {
      return { valid: false, error: `API validation error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, []);

  // Initialize player function
  const initializePlayer = useCallback(() => {
    // Validate API first
    const validation = validateYouTubeAPI();
    if (!validation.valid) {
      console.error('[YouTubePlayer] API validation failed:', validation.error);
      setError(validation.error || 'YouTube API is not valid');
      pendingVideoRef.current = null;
      return;
    }

    if (!containerRef.current) {
      console.log('[YouTubePlayer] Container not ready yet');
      return;
    }
    if (playerRef.current) {
      console.log('[YouTubePlayer] Player already initialized');
      return;
    }
    if (!containerRef.current) {
      console.log('[YouTubePlayer] Container not ready yet');
      return;
    }
    if (playerRef.current) {
      console.log('[YouTubePlayer] Player already initialized');
      return;
    }

    try {
      console.log('[YouTubePlayer] Initializing player...');
      const ytPlayer = new window.YT.Player(playerIdRef.current, {
        width: 0,
        height: 0,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: (event) => {
            console.log('[YouTubePlayer] ✅ Player ready');
            setPlayer(event.target);
            playerRef.current = event.target;
            setIsReady(true);
            setError(null);
            
            // Play any pending video that was queued before player was ready
            if (pendingVideoRef.current) {
              const { videoId, startSeconds } = pendingVideoRef.current;
              pendingVideoRef.current = null;
              console.log('[YouTubePlayer] Playing queued video:', videoId);
              try {
                event.target.loadVideoById(videoId, startSeconds);
                setTimeout(() => {
                  try {
                    event.target.playVideo();
                  } catch (err) {
                    console.log('[YouTubePlayer] Autoplay may require user gesture');
                  }
                }, 500);
              } catch (err) {
                console.error('[YouTubePlayer] Failed to play queued video:', err);
                setError('Failed to play video');
              }
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
            const playing = state === 1; // PLAYING
            setIsPlaying(playing);
            console.log(
              '[YouTubePlayer] State changed:',
              state,
              playing ? 'PLAYING' : state === 2 ? 'PAUSED' : state === 0 ? 'ENDED' : 'OTHER',
              'Tab hidden:',
              document.hidden
            );

            // Track playing state for visibility handling
            if (playing) {
              wasPlayingBeforeHiddenRef.current = true;
            }

            // If tab is hidden and video got paused, try to resume immediately
            if (state === 2 && document.hidden && wasPlayingBeforeHiddenRef.current) {
              console.log('[YouTubePlayer] ⚠️ Video paused while tab hidden - attempting immediate resume...');
              setTimeout(() => {
                try {
                  if (playerRef.current && document.hidden) {
                    const currentState = playerRef.current.getPlayerState();
                    if (currentState === 2) { // Still paused
                      playerRef.current.playVideo();
                      console.log('[YouTubePlayer] ✅ Resumed playback after pause detected while hidden');
                    }
                  }
                } catch (err) {
                  console.warn('[YouTubePlayer] Failed to resume after pause while hidden:', err);
                }
              }, 100);
            }

            // Notify components when video ends or pauses (for agent wake)
            // Components listening to isPlaying will handle agent.control messages
            if (state === 0) {
              // Video ended - notify via custom event
              wasPlayingBeforeHiddenRef.current = false;
              window.dispatchEvent(new CustomEvent('youtube-video-ended'));
            } else if (state === 2) {
              // Video paused - only notify if tab is visible (not paused due to tab hidden)
              // We'll handle tab visibility separately
              if (document.visibilityState === 'visible') {
                window.dispatchEvent(new CustomEvent('youtube-video-paused'));
              }
            }
          },
          onError: (event) => {
            const errorCode = event.data;
            console.error('[YouTubePlayer] Error:', errorCode);

            // YouTube error codes mapping
            let errorMessage = 'Unknown error';
            switch (errorCode) {
              case 2:
                errorMessage = 'Invalid video ID';
                break;
              case 5:
                errorMessage = 'HTML5 player error';
                break;
              case 100:
                errorMessage = 'Video not found or has been removed';
                break;
              case 101:
              case 150:
                errorMessage = 'Video is not available for embedding or playback is restricted';
                break;
              default:
                errorMessage = `YouTube error ${errorCode}`;
            }

            setError(errorMessage);
          },
        },
      });
    } catch (err) {
      console.error('[YouTubePlayer] Failed to initialize:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to initialize YouTube player: ${errorMessage}`);
      // Clear any pending video since initialization failed
      pendingVideoRef.current = null;
    }
  }, [validateYouTubeAPI]);

  // Load YouTube IFrame API script
  useEffect(() => {
    // Create container first
    if (!containerRef.current) {
      const container = document.createElement('div');
      container.id = playerIdRef.current;
      // Start hidden (audio-only)
      container.style.display = 'none';
      container.style.width = '0';
      container.style.height = '0';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      containerRef.current = container;
    }

    // Check if API is already loaded and validate it
    if (window.YT && window.YT.Player) {
      const validation = validateYouTubeAPI();
      if (validation.valid) {
        if (!scriptLoadedRef.current) {
          scriptLoadedRef.current = true;
          console.log('[YouTubePlayer] ✅ YouTube IFrame API already loaded and validated');
        }
        // Initialize player after a short delay to ensure container is ready
        setTimeout(() => {
          initializePlayer();
        }, 100);
        return;
      } else {
        console.warn('[YouTubePlayer] ⚠️ API exists but validation failed:', validation.error);
        // Continue to load/reload the API
      }
    }

    // Set up ready callback (only once)
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        scriptLoadedRef.current = true;
        console.log('[YouTubePlayer] YouTube IFrame API script loaded');
        
        // Clear timeout since API loaded successfully
        if (apiLoadTimeoutRef.current) {
          clearTimeout(apiLoadTimeoutRef.current);
          apiLoadTimeoutRef.current = null;
        }

        // Validate API after it loads
        const validation = validateYouTubeAPI();
        if (!validation.valid) {
          console.error('[YouTubePlayer] ❌ API loaded but validation failed:', validation.error);
          setError(validation.error || 'YouTube API validation failed');
          pendingVideoRef.current = null;
          return;
        }

        console.log('[YouTubePlayer] ✅ YouTube IFrame API ready and validated');
        // Wait a bit to ensure container is in DOM
        setTimeout(() => {
          initializePlayer();
        }, 100);
      };
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existingScript) {
      // Script is loading, wait for onYouTubeIframeAPIReady callback
      // Set a timeout to detect if API fails to load
      if (!apiLoadTimeoutRef.current) {
        apiLoadTimeoutRef.current = setTimeout(() => {
          if (!scriptLoadedRef.current) {
            console.error(
              '[YouTubePlayer] ⏱️ API load timeout - script exists but callback not fired'
            );

            // Fallback: if YT is actually present, try to validate and init manually
            if (window.YT && window.YT.Player) {
              console.warn(
                '[YouTubePlayer] ⚠️ Timeout, but YT object exists - attempting manual init'
              );
              const validation = validateYouTubeAPI();
              if (validation.valid) {
                scriptLoadedRef.current = true;
                setError(null);
                // Initialize player after a short delay to ensure container is ready
                setTimeout(() => {
                  initializePlayer();
                }, 100);
                return;
              } else {
                console.error(
                  '[YouTubePlayer] ❌ Manual init failed after timeout - API invalid:',
                  validation.error
                );
                setError(validation.error || 'YouTube API validation failed');
                pendingVideoRef.current = null;
                return;
              }
            }

            // Check if we can retry
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              console.log(
                `[YouTubePlayer] Retrying API load (attempt ${retryCountRef.current}/${maxRetries})...`
              );
              // Remove the existing script and retry
              existingScript.remove();
              scriptLoadedRef.current = false;
              // Retry loading
              setTimeout(() => {
                const newScript = document.createElement('script');
                newScript.src = 'https://www.youtube.com/iframe_api';
                newScript.async = true;
                newScript.onerror = () => {
                  console.error('[YouTubePlayer] ❌ Retry failed to load YouTube IFrame API script');
                  if (retryCountRef.current >= maxRetries) {
                    setError('Failed to load YouTube API after multiple attempts. Please check your internet connection and refresh the page.');
                  }
                };
                document.body.appendChild(newScript);
              }, 1000);
            } else {
              setError('YouTube API failed to load (timeout). Please check your internet connection and refresh the page.');
              pendingVideoRef.current = null;
            }
          }
        }, API_LOAD_TIMEOUT);
      }
      return;
    }

    // Load YouTube IFrame API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    // Set timeout to detect if API fails to load
    apiLoadTimeoutRef.current = setTimeout(() => {
      if (!scriptLoadedRef.current) {
        console.error('[YouTubePlayer] ⏱️ API load timeout - script failed to load');
        console.error('[YouTubePlayer] Diagnostic info:', {
          scriptExists: !!document.querySelector('script[src="https://www.youtube.com/iframe_api"]'),
          ytExists: typeof window.YT,
          ytPlayerExists: typeof window.YT?.Player,
          callbackExists: typeof window.onYouTubeIframeAPIReady,
          retryCount: retryCountRef.current,
        });
        // Check if we can retry
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[YouTubePlayer] Retrying API load (attempt ${retryCountRef.current}/${maxRetries})...`);
          // Remove the script and retry
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          scriptLoadedRef.current = false;
          // Retry loading after a delay
          setTimeout(() => {
            const newScript = document.createElement('script');
            newScript.src = 'https://www.youtube.com/iframe_api';
            newScript.async = true;
            newScript.onerror = () => {
              console.error('[YouTubePlayer] ❌ Retry failed to load YouTube IFrame API script');
              if (retryCountRef.current >= maxRetries) {
                setError('Failed to load YouTube API after multiple attempts. Please check your internet connection and refresh the page.');
                pendingVideoRef.current = null;
              }
            };
            document.body.appendChild(newScript);
          }, 1000);
        } else {
          setError('YouTube API failed to load (timeout). Please check your internet connection and refresh the page.');
          pendingVideoRef.current = null;
        }
      }
    }, API_LOAD_TIMEOUT);

    script.onerror = () => {
      console.error('[YouTubePlayer] ❌ Failed to load YouTube IFrame API script');
      // Clear timeout
      if (apiLoadTimeoutRef.current) {
        clearTimeout(apiLoadTimeoutRef.current);
        apiLoadTimeoutRef.current = null;
      }
      // Check if we can retry
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`[YouTubePlayer] Retrying API load after error (attempt ${retryCountRef.current}/${maxRetries})...`);
        // Retry loading after a delay
        setTimeout(() => {
          const newScript = document.createElement('script');
          newScript.src = 'https://www.youtube.com/iframe_api';
          newScript.async = true;
          newScript.onerror = () => {
            console.error('[YouTubePlayer] ❌ Retry failed to load YouTube IFrame API script');
            if (retryCountRef.current >= maxRetries) {
              setError('Failed to load YouTube API after multiple attempts. Please check your internet connection and refresh the page.');
              pendingVideoRef.current = null;
            }
          };
          document.body.appendChild(newScript);
        }, 2000);
      } else {
        setError('Failed to load YouTube API. Please check your internet connection.');
        // Clear any pending video since API failed to load
        pendingVideoRef.current = null;
      }
    };

    script.onload = () => {
      // Script loaded, but we still need to wait for onYouTubeIframeAPIReady
      console.log('[YouTubePlayer] ✅ Script element loaded successfully, waiting for API ready callback...');
      console.log('[YouTubePlayer] Checking if YT object exists:', typeof window.YT);
    };

    document.body.appendChild(script);

    // Handle page visibility changes to keep playback going in background
    const handleVisibilityChange = () => {
      if (!playerRef.current || !isReady) return;

      if (document.hidden) {
        // Tab is hidden - remember if we were playing
        try {
          const state = playerRef.current.getPlayerState();
          wasPlayingBeforeHiddenRef.current = state === 1; // PLAYING = 1
          console.log('[YouTubePlayer] Tab hidden, was playing:', wasPlayingBeforeHiddenRef.current);
          
          // Set up periodic check to resume if browser/YouTube paused it
          if (wasPlayingBeforeHiddenRef.current) {
            // Clear any existing interval first
            if (backgroundResumeIntervalRef.current) {
              clearInterval(backgroundResumeIntervalRef.current);
            }
            
            // More aggressive checking - every 500ms
            backgroundResumeIntervalRef.current = setInterval(() => {
              if (!playerRef.current || !document.hidden) {
                if (backgroundResumeIntervalRef.current) {
                  clearInterval(backgroundResumeIntervalRef.current);
                  backgroundResumeIntervalRef.current = null;
                }
                return;
              }
              
              try {
                const currentState = playerRef.current.getPlayerState();
                // If it got paused (but we want it playing), try to resume
                if (currentState === 2 && wasPlayingBeforeHiddenRef.current) { // PAUSED = 2
                  console.log('[YouTubePlayer] 🔄 Detected pause while tab hidden, attempting to resume...');
                  playerRef.current.playVideo();
                  // Also try again after a short delay in case it doesn't work immediately
                  setTimeout(() => {
                    if (playerRef.current && document.hidden) {
                      try {
                        const checkState = playerRef.current.getPlayerState();
                        if (checkState === 2) {
                          playerRef.current.playVideo();
                          console.log('[YouTubePlayer] 🔄 Retry resume after pause');
                        }
                      } catch (e) {
                        // Ignore
                      }
                    }
                  }, 200);
                }
              } catch (err) {
                // Ignore errors - player might not be ready
              }
            }, 500); // Check every 500ms (more aggressive)
          }
        } catch (err) {
          console.warn('[YouTubePlayer] Could not check player state on hide:', err);
        }
      } else {
        // Tab is visible again - clear background resume interval
        if (backgroundResumeIntervalRef.current) {
          clearInterval(backgroundResumeIntervalRef.current);
          backgroundResumeIntervalRef.current = null;
        }
        
        // Resume if we were playing before
        if (wasPlayingBeforeHiddenRef.current) {
          console.log('[YouTubePlayer] Tab visible again, resuming playback...');
          setTimeout(() => {
            try {
              if (playerRef.current) {
                const currentState = playerRef.current.getPlayerState();
                // Only resume if currently paused (not ended)
                if (currentState === 2) { // PAUSED = 2
                  playerRef.current.playVideo();
                  console.log('[YouTubePlayer] ✅ Resumed playback after tab became visible');
                }
              }
            } catch (err) {
              console.warn('[YouTubePlayer] Failed to resume after tab visible:', err);
            }
          }, 300);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Clear timeout if component unmounts
      if (apiLoadTimeoutRef.current) {
        clearTimeout(apiLoadTimeoutRef.current);
        apiLoadTimeoutRef.current = null;
      }
      if (backgroundResumeIntervalRef.current) {
        clearInterval(backgroundResumeIntervalRef.current);
        backgroundResumeIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, [initializePlayer, validateYouTubeAPI, isReady]);

  const playVideo = useCallback(async (videoId: string, startSeconds = 0) => {
    // If player is not ready yet, queue the video to play once ready
    if (!playerRef.current || !isReady) {
      console.log('[YouTubePlayer] Player not ready yet, queueing video:', videoId);
      pendingVideoRef.current = { videoId, startSeconds };
      setCurrentVideoId(videoId);
      // Don't set error - just wait for player to be ready
      return;
    }

    try {
      // Clear any previous errors when attempting to play a new video
      setError(null);
      setCurrentVideoId(videoId);
      playerRef.current.loadVideoById(videoId, startSeconds);
      // Mark that we want this playing (for background resume)
      wasPlayingBeforeHiddenRef.current = true;
      // Try to play immediately (may require user gesture for autoplay)
      // If autoplay is blocked, user will need to interact first
      setTimeout(() => {
        try {
          playerRef.current?.playVideo();
        } catch (err) {
          // Autoplay may be blocked - this is expected behavior
          console.log('[YouTubePlayer] Autoplay may require user gesture');
        }
      }, 500);
    } catch (err) {
      console.error('Failed to play video:', err);
      setError('Failed to play video');
    }
  }, [isReady]);

  const pause = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.pauseVideo();
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  }, []);

  const resume = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.playVideo();
    } catch (err) {
      console.error('Failed to resume:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.stopVideo();
      setCurrentVideoId(null);
      setError(null); // Clear error when stopping
    } catch (err) {
      console.error('Failed to stop:', err);
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.seekTo(seconds, true);
    } catch (err) {
      console.error('Failed to seek:', err);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(Math.max(0, Math.min(100, volume)));
    } catch (err) {
      console.error('Failed to set volume:', err);
    }
  }, []);

  const retry = useCallback(() => {
    console.log('[YouTubePlayer] Retrying YouTube API load...');
    
    // Clear any existing timeouts
    if (apiLoadTimeoutRef.current) {
      clearTimeout(apiLoadTimeoutRef.current);
      apiLoadTimeoutRef.current = null;
    }

    // Reset state
    setError(null);
    scriptLoadedRef.current = false;
    retryCountRef.current = 0;
    setIsReady(false);
    setPlayer(null);
    
    // Destroy existing player if any
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Ignore
      }
      playerRef.current = null;
    }

    // Remove existing script if any
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Clear the global callback (we can't delete because it's non-optional in the type)
    if (typeof window.onYouTubeIframeAPIReady === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).onYouTubeIframeAPIReady = undefined;
    }

    // Reload the script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    // Set up ready callback
    window.onYouTubeIframeAPIReady = () => {
      scriptLoadedRef.current = true;
      console.log('[YouTubePlayer] ✅ YouTube IFrame API script loaded (retry)');
      
      // Clear timeout
      if (apiLoadTimeoutRef.current) {
        clearTimeout(apiLoadTimeoutRef.current);
        apiLoadTimeoutRef.current = null;
      }

      // Validate API
      const validation = validateYouTubeAPI();
      if (!validation.valid) {
        console.error('[YouTubePlayer] ❌ API loaded but validation failed:', validation.error);
        setError(validation.error || 'YouTube API validation failed');
        return;
      }

      console.log('[YouTubePlayer] ✅ YouTube IFrame API ready and validated (retry)');
      setTimeout(() => {
        initializePlayer();
      }, 100);
    };

    // Set timeout
    apiLoadTimeoutRef.current = setTimeout(() => {
      if (!scriptLoadedRef.current) {
        console.error('[YouTubePlayer] ⏱️ API load timeout (retry)');
        setError('YouTube API failed to load. Please check your internet connection.');
      }
    }, API_LOAD_TIMEOUT);

    script.onerror = () => {
      console.error('[YouTubePlayer] ❌ Failed to load YouTube IFrame API script (retry)');
      setError('Failed to load YouTube API. Please check your internet connection.');
      if (apiLoadTimeoutRef.current) {
        clearTimeout(apiLoadTimeoutRef.current);
        apiLoadTimeoutRef.current = null;
      }
    };

    document.body.appendChild(script);
  }, [validateYouTubeAPI, initializePlayer]);

  return {
    player,
    isReady,
    error,
    isPlaying,
    currentVideoId,
    playVideo,
    pause,
    resume,
    stop,
    seekTo,
    setVolume,
    retry,
  };
}
