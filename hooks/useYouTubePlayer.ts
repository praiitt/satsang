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

  // Initialize player function
  const initializePlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player) {
      console.log('[YouTubePlayer] API not ready yet');
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
          },
          onStateChange: (event) => {
            const state = event.data;
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
            const playing = state === 1; // PLAYING
            setIsPlaying(playing);
            console.log(
              '[YouTubePlayer] State changed:',
              state,
              playing ? 'PLAYING' : state === 2 ? 'PAUSED' : state === 0 ? 'ENDED' : 'OTHER'
            );
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
      setError('Failed to initialize YouTube player');
    }
  }, []);

  // Load YouTube IFrame API script
  useEffect(() => {
    // Create container first
    if (!containerRef.current) {
      const container = document.createElement('div');
      container.id = playerIdRef.current;
      container.style.display = 'none';
      container.style.width = '0';
      container.style.height = '0';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      containerRef.current = container;
    }

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      if (!scriptLoadedRef.current) {
        scriptLoadedRef.current = true;
        console.log('YouTube IFrame API already loaded');
      }
      // Initialize player after a short delay to ensure container is ready
      setTimeout(() => {
        initializePlayer();
      }, 100);
      return;
    }

    // Set up ready callback (only once)
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        scriptLoadedRef.current = true;
        console.log('YouTube IFrame API ready');
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
      return;
    }

    // Load YouTube IFrame API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    script.onerror = () => {
      console.error('Failed to load YouTube IFrame API');
      setError('Failed to load YouTube API');
    };

    document.body.appendChild(script);

    return () => {
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
  }, [initializePlayer]);

  const playVideo = useCallback(async (videoId: string, startSeconds = 0) => {
    if (!playerRef.current) {
      setError('YouTube player not ready');
      return;
    }

    try {
      // Clear any previous errors when attempting to play a new video
      setError(null);
      setCurrentVideoId(videoId);
      playerRef.current.loadVideoById(videoId, startSeconds);
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
  }, []);

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
  };
}
