'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
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
  const room = useRoomContext();
  const [currentTrack, setCurrentTrack] = useState<BhajanTrackInfo | null>(null);
  const [useSpotify, setUseSpotify] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageRef = useRef<string>('');
  const messageTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const PREFER_EVENTS = true; // Do not parse chat text for URLs/JSON when events are available

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

  // Prefer structured events over text parsing: listen for bhajan.track data messages
  useEffect(() => {
    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      try {
        const text = new TextDecoder().decode(payload);
        // Only handle our topic when provided, but also accept older clients without topic
        if (topic && topic !== 'bhajan.track') return;

        const parsed = JSON.parse(text) as { url?: string; name?: string; artist?: string; spotify_id?: string; external_url?: string };
        // Guard: ensure it looks like a bhajan payload
        if (!parsed || (!parsed.url && !parsed.spotify_id) || !parsed.name) return;

        const track: BhajanTrackInfo = {
          url: typeof parsed.url === 'string' ? parsed.url : undefined,
          name: typeof parsed.name === 'string' ? parsed.name : undefined,
          artist: typeof parsed.artist === 'string' ? parsed.artist : undefined,
          spotify_id: typeof parsed.spotify_id === 'string' ? parsed.spotify_id : undefined,
          external_url: typeof parsed.external_url === 'string' ? parsed.external_url : undefined,
        };

        console.log('[BhajanPlayer] Data event received', { topic, track });
        setCurrentTrack(track);
        setUseSpotify(!!track.spotify_id && isAuthenticated);
      } catch {
        // Ignore non-JSON or unrelated messages
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, isAuthenticated]);

  // Parse agent messages for bhajan playback info (fallback only)
  useEffect(() => {
    if (PREFER_EVENTS) {
      // Skip text parsing entirely; rely on data channel events
      return;
    }
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

    const messageText = latestMessage.message.trim();

    // Check if message is still streaming
    // 1. Check if JSON braces are balanced (complete JSON)
    // 2. Check for streaming indicators
    const openBraces = (messageText.match(/{/g) || []).length;
    const closeBraces = (messageText.match(/}/g) || []).length;
    const hasIncompleteJson = messageText.includes('{') && openBraces > closeBraces;
    const hasStreamingIndicator = messageText.endsWith('...') || messageText.endsWith('…');
    
    // If message appears incomplete, wait a bit for it to complete
    if (hasIncompleteJson || hasStreamingIndicator) {
      // Clear any existing timeout for this message
      const existingTimeout = messageTimeoutsRef.current.get(latestMessage.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set a timeout to check again after message completes (wait 2 seconds of no updates)
      const timeout = setTimeout(() => {
        // Re-check if message has completed
        const updatedMessages = messages.filter((m) => m.from?.isAgent);
        const updatedMessage = updatedMessages[updatedMessages.length - 1];
        if (updatedMessage && updatedMessage.id === latestMessage.id) {
          // Message hasn't changed, process it now
          processMessage(updatedMessage);
        }
        messageTimeoutsRef.current.delete(latestMessage.id);
      }, 2000); // Wait 2 seconds for message to complete

      messageTimeoutsRef.current.set(latestMessage.id, timeout);
      console.log('[BhajanPlayer] Message appears incomplete, waiting for completion...', {
        id: latestMessage.id,
        hasIncompleteJson,
        hasStreamingIndicator,
      });
      return;
    }

    // Message appears complete, process it immediately
    processMessage(latestMessage);

    function processMessage(message: typeof latestMessage) {
      // Try to parse as JSON first, but only if message looks like it contains bhajan data
      let trackInfo: BhajanTrackInfo | null = null;
      let parsedJson: Record<string, unknown> | null = null;

      const messageText = message.message.trim();

      // Debug: Log all agent messages to help diagnose
      console.log('[BhajanPlayer] Agent message received:', {
        id: message.id,
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

    // If we didn't find JSON at end, try to find JSON anywhere in the message
    // The JSON might be in the middle if the agent continues speaking after it
    if (!parsedJson) {
      // Find all potential JSON start positions (opening braces)
      const jsonStartIndices: number[] = [];
      for (let i = 0; i < messageText.length; i++) {
        if (messageText[i] === '{') {
          jsonStartIndices.push(i);
        }
      }

      // Try to parse each potential JSON object
      for (const startIndex of jsonStartIndices) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let jsonEnd = -1;

        // Find the matching closing brace, handling escaped quotes and nested braces
        for (let i = startIndex; i < messageText.length; i++) {
          const char = messageText[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
          }
        }

        if (jsonEnd > startIndex) {
          const jsonCandidate = messageText.substring(startIndex, jsonEnd);
          try {
            const candidate = JSON.parse(jsonCandidate) as Record<string, unknown>;
            // Verify it looks like a bhajan response (has name, spotify_id, or url)
            if (
              candidate.name ||
              candidate.spotify_id ||
              candidate.url ||
              candidate.preview_url
            ) {
              parsedJson = candidate;
              console.log('[BhajanPlayer] Extracted JSON from message:', jsonCandidate);
              break;
            }
          } catch {
            // Invalid JSON, try next candidate
          }
        }
      }
    }

    // If still no JSON found, try parsing entire message as JSON
    if (!parsedJson) {
      try {
        parsedJson = JSON.parse(messageText) as Record<string, unknown>;
      } catch {
        // Not pure JSON, that's okay
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
      lastProcessedMessageRef.current = message.id;

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

    // Mark message as processed
    lastProcessedMessageRef.current = message.id;
    }

    // Cleanup timeouts on unmount
    return () => {
      messageTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      messageTimeoutsRef.current.clear();
    };
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
              <div className="mt-0.5 flex items-center gap-2">
                <div className="text-muted-foreground text-xs">
                  {spotifyError ? 'Spotify authentication required' : 'Connecting to Spotify...'}
                </div>
                {spotifyError && (
                  <button
                    onClick={() => {
                      window.location.href = '/api/spotify/auth';
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-0.5 text-xs transition-colors"
                  >
                    Connect Spotify
                  </button>
                )}
              </div>
            )}
            {spotifyError &&
              !(
                !useSpotify &&
                !currentTrack.url &&
                currentTrack.spotify_id &&
                !isAuthenticated
              ) && <div className="text-destructive mt-0.5 text-xs">{spotifyError}</div>}
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
