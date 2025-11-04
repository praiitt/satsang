'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

interface BhajanTrackInfo {
  url?: string;
  name?: string;
  artist?: string;
  message?: string;
  spotify_id?: string;
  external_url?: string;
}

/**
 * Enhanced Bhajan Player Component
 *
 * Uses Spotify Web Playback SDK for full tracks when authenticated,
 * falls back to preview URLs for non-premium users or when Spotify isn't available.
 */
export function BhajanPlayer() {
  const messages = useChatMessages();
  const [currentTrack, setCurrentTrack] = useState<BhajanTrackInfo | null>(null);
  const [useSpotify, setUseSpotify] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageRef = useRef<string>('');

  // Spotify player hook
  const {
    isAuthenticated,
    isReady,
    deviceId,
    error: spotifyError,
    connect,
    playTrack,
    pause,
    resume,
  } = useSpotifyPlayer();

  // Parse agent messages for bhajan playback info
  useEffect(() => {
    // Get the latest agent message (assistant/agent)
    const agentMessages = messages.filter((m) => m.from?.isAgent);
    if (agentMessages.length === 0) {
      return;
    }

    const latestMessage = agentMessages[agentMessages.length - 1];

    // Skip if we've already processed this message
    if (latestMessage.id === lastProcessedMessageRef.current) {
      return;
    }

    // Try to parse as JSON first, but only if message looks like it contains bhajan data
    let trackInfo: BhajanTrackInfo | null = null;
    let parsedJson: Record<string, unknown> | null = null;

    const messageText = latestMessage.message.trim();

    // Debug: Log all agent messages to help diagnose
    console.log('[BhajanPlayer] Agent message received:', {
      id: latestMessage.id,
      message: messageText.substring(0, 100), // First 100 chars
      fullLength: messageText.length,
    });

    // Skip if message doesn't look like it contains bhajan data
    // Check for: JSON braces, Spotify URLs, or keywords like "bhajan", "playing", "बज रहा"
    const hasBhajanIndicators =
      messageText.includes('{') ||
      messageText.includes('spotify.com/track/') ||
      messageText.toLowerCase().includes('bhajan') ||
      messageText.includes('बज रहा') ||
      messageText.includes('playing') ||
      messageText.includes('भजन');

    if (!hasBhajanIndicators) {
      // Regular conversation message, not a bhajan response
      console.log('[BhajanPlayer] Skipping - no bhajan indicators found');
      return;
    }

    console.log('[BhajanPlayer] Processing message with bhajan indicators');

    // First, try to find JSON at the end of the message (agent might append it)
    // Look for JSON pattern at the end: {...} or {...} followed by nothing or whitespace
    const jsonAtEndMatch = messageText.match(/\{[\s\S]*\}(?:\s*)$/);
    if (jsonAtEndMatch) {
      try {
        parsedJson = JSON.parse(jsonAtEndMatch[0]) as Record<string, unknown>;
        console.log('[BhajanPlayer] Found JSON at end of message:', jsonAtEndMatch[0]);
      } catch {
        // JSON at end is invalid, try other methods
      }
    }

    // If we didn't find JSON at end, try parsing entire message or extracting from middle
    if (!parsedJson) {
      try {
        // Try to parse the entire message as JSON
        parsedJson = JSON.parse(messageText) as Record<string, unknown>;
      } catch {
        // Not pure JSON, try to extract JSON from the message
        // The LLM might wrap the JSON in text like "भजन बज रहा है। {...json...}"
        // Try to find complete JSON objects (not just fragments)
        // Look for {...} that contains bhajan-related fields
        const jsonPatterns = [
          /\{[^{}]*"url"[^{}]*"name"[^{}]*\}/, // JSON with url and name
          /\{[^{}]*"spotify_id"[^{}]*"name"[^{}]*\}/, // JSON with spotify_id and name
          /\{[^{}]*"url"[^{}]*"spotify_id"[^{}]*\}/, // JSON with both url and spotify_id
          /\{[^{}]*"url"[^{}]*\}/, // JSON with just url
          /\{[^{}]*"spotify_id"[^{}]*\}/, // JSON with just spotify_id
        ];

        for (const pattern of jsonPatterns) {
          const matches = messageText.match(pattern);
          if (matches) {
            // Try to find the complete JSON object by looking for matching braces
            const startIndex = messageText.indexOf(matches[0]);
            if (startIndex !== -1) {
              // Try to find the complete JSON object
              let braceCount = 0;
              let jsonEnd = startIndex;
              for (let i = startIndex; i < messageText.length; i++) {
                if (messageText[i] === '{') braceCount++;
                if (messageText[i] === '}') braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
              const jsonCandidate = messageText.substring(startIndex, jsonEnd);
              try {
                parsedJson = JSON.parse(jsonCandidate) as Record<string, unknown>;
                console.log('[BhajanPlayer] Extracted JSON from text:', jsonCandidate);
                break;
              } catch {
                // Try next pattern
              }
            }
          }
        }
      }
    }

    // If we have parsed JSON, process it
    if (parsedJson) {
      // Check if it's an error response
      if (parsedJson.error) {
        // Error message from agent
        console.warn('Bhajan error from agent:', parsedJson.error);
        // Log available bhajans if provided
        if (parsedJson.available_bhajans) {
          console.log('Available bhajans:', parsedJson.available_bhajans);
        }
        return;
      }

      // Agent returns one of these formats:
      // 1. Success with preview: { url, name, artist, spotify_id, external_url, message }
      // 2. Success without preview: { url: null, name, artist, spotify_id, external_url, message }
      // 3. Error: { error, available_bhajans?, external_url? }

      // Check if it's a valid track response
      // Must have at least one of: url, preview_url, or spotify_id
      const hasUrl = parsedJson.url || parsedJson.preview_url;
      const hasSpotifyId = parsedJson.spotify_id;

      if (hasUrl || hasSpotifyId) {
        trackInfo = {
          // url can be preview_url or null - use whatever is available
          url:
            (typeof parsedJson.url === 'string' ? parsedJson.url : undefined) ||
            (typeof parsedJson.preview_url === 'string' ? parsedJson.preview_url : undefined) ||
            undefined,
          name: typeof parsedJson.name === 'string' ? parsedJson.name : undefined,
          artist: typeof parsedJson.artist === 'string' ? parsedJson.artist : undefined,
          message: typeof parsedJson.message === 'string' ? parsedJson.message : undefined,
          spotify_id: typeof parsedJson.spotify_id === 'string' ? parsedJson.spotify_id : undefined,
          external_url:
            typeof parsedJson.external_url === 'string' ? parsedJson.external_url : undefined,
        };

        console.log('Bhajan track info received (JSON):', {
          name: trackInfo.name,
          artist: trackInfo.artist,
          hasUrl: !!trackInfo.url,
          hasSpotifyId: !!trackInfo.spotify_id,
        });
      } else {
        // Invalid format - but don't log warning for regular messages
        // Only log if we actually found JSON structure
        if (messageText.includes('{')) {
          console.warn('Invalid bhajan response format:', parsedJson);
        }
      }
    } else {
      // No JSON found, try to extract Spotify track ID from URL in plain text
      // This happens when LLM wraps the JSON in text and includes the URL
      // Pattern: https://open.spotify.com/track/TRACK_ID
      const spotifyUrlMatch = messageText.match(
        /https?:\/\/(?:open\.)?spotify\.com\/track\/([a-zA-Z0-9]+)/i
      );

      if (spotifyUrlMatch && spotifyUrlMatch[1]) {
        const extractedTrackId = spotifyUrlMatch[1];
        console.log('[BhajanPlayer] Found Spotify track ID in message URL:', extractedTrackId);

        // When we only have spotify_id from URL (no JSON), we can't play it without auth or preview URL
        // The agent should have returned JSON with preview_url, but LLM wrapped it in text
        // Log a warning but don't try to play (would need Spotify auth or preview URL)
        console.warn(
          '[BhajanPlayer] Track ID found in URL but no JSON data - agent should return JSON format. ' +
            'Track requires Spotify authentication for playback.'
        );

        // Don't set trackInfo - we need preview_url or authentication to play
        // This prevents silent failures
      }
    }

    if (trackInfo) {
      console.log('[BhajanPlayer] Track info extracted:', {
        name: trackInfo.name,
        hasUrl: !!trackInfo.url,
        hasSpotifyId: !!trackInfo.spotify_id,
        spotify_id: trackInfo.spotify_id,
      });

      setCurrentTrack(trackInfo);
      lastProcessedMessageRef.current = latestMessage.id;

      // Determine if we should use Spotify SDK
      // Priority: Spotify SDK (if authenticated and spotify_id available) > Preview URL
      const hasSpotifyId = !!trackInfo.spotify_id;
      const hasPreviewUrl = !!trackInfo.url;

      // Use Spotify SDK if:
      // 1. User is authenticated with Spotify
      // 2. Track has a spotify_id
      // Will fall back to preview URL if Spotify fails
      const shouldUseSpotify = isAuthenticated && hasSpotifyId;

      if (shouldUseSpotify && !useSpotify) {
        console.log(
          '[BhajanPlayer] Using Spotify SDK for playback (has spotify_id:',
          trackInfo.spotify_id,
          ')'
        );
        setUseSpotify(true);
      } else if (hasSpotifyId && !isAuthenticated) {
        // Has spotify_id but user not authenticated - try to initialize Spotify
        console.log(
          '[BhajanPlayer] Has spotify_id but not authenticated - attempting to initialize Spotify'
        );
        if (hasPreviewUrl) {
          // Use preview URL as fallback, but still try to connect Spotify for future tracks
          console.log('[BhajanPlayer] Using preview URL (not authenticated with Spotify)');
          setUseSpotify(false);
          // Try to connect in background (non-blocking)
          connect().catch(() => {
            // Ignore errors - just trying to initialize for future use
          });
        } else {
          // No preview URL - must use Spotify SDK
          console.log(
            '[BhajanPlayer] Only spotify_id available - attempting to connect to Spotify'
          );
          // Try to connect - this will initialize player if token is available
          connect()
            .then(() => {
              // If connection succeeds, use Spotify SDK
              if (isAuthenticated) {
                setUseSpotify(true);
              }
            })
            .catch(() => {
              // Connection failed - will show message in UI
              console.warn(
                '[BhajanPlayer] Spotify connection failed - user may need to authenticate'
              );
              setUseSpotify(false);
            });
        }
      } else if (!hasSpotifyId && hasPreviewUrl) {
        // No spotify_id but has preview URL - use preview
        console.log('[BhajanPlayer] Using preview URL (no spotify_id available)');
        setUseSpotify(false);
      } else if (!hasSpotifyId && !hasPreviewUrl) {
        // No playback options available
        console.warn('[BhajanPlayer] No playback options available - no spotify_id or preview_url');
        setUseSpotify(false);
      }
    } else {
      console.log('[BhajanPlayer] No track info extracted from message');
    }
  }, [messages, isAuthenticated, isReady, useSpotify, connect]);

  // Auto-connect to Spotify when authenticated
  useEffect(() => {
    if (isAuthenticated && !isReady && !spotifyError) {
      console.log('[BhajanPlayer] Auto-connecting to Spotify...');
      connect();
    }
  }, [isAuthenticated, isReady, spotifyError, connect]);

  // Play track using Spotify SDK
  useEffect(() => {
    if (!currentTrack || !currentTrack.spotify_id) {
      return;
    }

    // If we have a spotify_id but no preview URL, we MUST use Spotify SDK
    // Try to play immediately when ready, or wait for authentication/ready state
    const shouldTrySpotify = useSpotify || (!currentTrack.url && currentTrack.spotify_id);

    if (!shouldTrySpotify) {
      return;
    }

    // Try to play with Spotify SDK
    // If player is ready, play immediately
    // If not ready but authenticated, wait a bit and try
    const attemptPlay = async () => {
      if (isReady && deviceId) {
        try {
          console.log('[BhajanPlayer] Playing track with Spotify SDK:', currentTrack.spotify_id);
          await playTrack(currentTrack.spotify_id!);
          setIsPlaying(true);
        } catch (error) {
          console.error('[BhajanPlayer] Error playing track with Spotify:', error);
          // If preview URL available, fallback to preview
          if (currentTrack.url) {
            setUseSpotify(false);
          }
        }
      } else if (isAuthenticated && !isReady) {
        // Wait for player to become ready - this will be handled by the effect when isReady changes
        console.log('[BhajanPlayer] Waiting for Spotify player to become ready...');
        // Don't set up interval here - the effect will re-run when isReady changes
        return;
      } else if (!isAuthenticated) {
        // Not authenticated yet - try to connect
        console.log('[BhajanPlayer] Not authenticated - attempting to connect...');
        connect()
          .then(() => {
            // Will retry after authentication succeeds
          })
          .catch(() => {
            // Authentication failed - will show message in UI
            console.warn('[BhajanPlayer] Spotify authentication required');
          });
      }
    };

    attemptPlay();
  }, [currentTrack, useSpotify, isReady, deviceId, isAuthenticated, playTrack, connect]);

  // Play audio when track URL changes (fallback mode - preview URLs)
  useEffect(() => {
    // Only use audio element if:
    // 1. We have a preview URL
    // 2. We're NOT using Spotify SDK
    // 3. Audio element exists
    // Capture audio ref at start of effect for cleanup
    const audio = audioRef.current;
    if (!currentTrack?.url || useSpotify || !audio) {
      return;
    }

    const trackSpotifyId = currentTrack.spotify_id;

    // Set up audio element
    console.log('[BhajanPlayer] Setting up audio playback:', {
      url: currentTrack.url,
      name: currentTrack.name,
    });

    audio.src = currentTrack.url;
    audio.volume = 0.8;

    // Event handlers
    const handleEnded = () => {
      console.log('[BhajanPlayer] Audio playback ended');
      setIsPlaying(false);
      setCurrentTrack(null);
    };
    const handleError = (e: ErrorEvent) => {
      console.error('[BhajanPlayer] Error playing audio:', e);
      setIsPlaying(false);
      // If preview fails and we have Spotify ID, try Spotify
      if (trackSpotifyId && isAuthenticated) {
        console.log('[BhajanPlayer] Preview failed, trying Spotify SDK');
        setUseSpotify(true);
      }
    };

    const handleCanPlay = () => {
      console.log('[BhajanPlayer] Audio can play, starting playback');
    };

    const handleLoadedData = () => {
      console.log('[BhajanPlayer] Audio data loaded');
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Auto-play
    audio
      .play()
      .then(() => {
        console.log('[BhajanPlayer] Audio playback started successfully');
      })
      .catch((error) => {
        console.error('[BhajanPlayer] Error playing audio:', error);
        // If preview fails and we have Spotify ID, try Spotify
        if (trackSpotifyId && isAuthenticated) {
          console.log('[BhajanPlayer] Preview play failed, trying Spotify SDK');
          setUseSpotify(true);
        }
      });

    return () => {
      // Use captured audio ref from effect start
      if (audio) {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      }
    };
  }, [
    currentTrack?.url,
    useSpotify,
    currentTrack?.spotify_id,
    currentTrack?.name,
    isAuthenticated,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  // Render visible player UI
  if (!currentTrack) {
    return (
      <>
        <audio ref={audioRef} preload="auto" />
      </>
    );
  }

  const handlePlayPause = async () => {
    // If using Spotify SDK, use Spotify controls
    if (useSpotify && currentTrack?.spotify_id) {
      if (isReady && deviceId) {
        if (isPlaying) {
          await pause();
        } else {
          await resume();
        }
      } else {
        // Player not ready yet - try to play track
        try {
          await playTrack(currentTrack.spotify_id);
          setIsPlaying(true);
        } catch (error) {
          console.error('[BhajanPlayer] Error playing:', error);
        }
      }
      return;
    }

    // Otherwise use HTML5 audio
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play().catch((error) => {
        console.error('[BhajanPlayer] Error playing:', error);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  };

  const currentlyPlaying = isPlaying || (audioRef.current && !audioRef.current.paused);

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      {/* Visible Player UI */}
      <div className="bg-background/95 border-input/50 animate-in slide-in-from-bottom-2 mb-2 rounded-lg border p-3 shadow-lg backdrop-blur-sm duration-300 md:p-4">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            aria-label={currentlyPlaying ? 'Pause' : 'Play'}
          >
            {currentlyPlaying ? (
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="ml-0.5 h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Track Info */}
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate text-sm font-medium">
              {currentTrack.name || 'भजन'}
            </div>
            {currentTrack.artist && (
              <div className="text-muted-foreground truncate text-xs">{currentTrack.artist}</div>
            )}
            {useSpotify && (
              <div className="text-primary mt-0.5 text-xs">
                {isReady ? 'Playing via Spotify' : 'Connecting to Spotify...'}
              </div>
            )}
            {!useSpotify && currentTrack.url && (
              <div className="text-muted-foreground mt-0.5 text-xs">Preview</div>
            )}
            {!useSpotify && !currentTrack.url && currentTrack.spotify_id && !isAuthenticated && (
              <div className="text-muted-foreground mt-0.5 text-xs">
                {spotifyError ? 'Spotify authentication required' : 'Connecting to Spotify...'}
              </div>
            )}
            {spotifyError && <div className="text-destructive mt-0.5 text-xs">{spotifyError}</div>}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
              }
              setCurrentTrack(null);
              setIsPlaying(false);
            }}
            className="hover:bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            aria-label="Stop playback"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
