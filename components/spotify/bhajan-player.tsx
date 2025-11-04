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

    try {
      // Try to parse the entire message as JSON
      parsedJson = JSON.parse(messageText) as Record<string, unknown>;
    } catch {
      // Not pure JSON, try to extract JSON from the message
      // The LLM might wrap the JSON in text like "भजन बज रहा है। {...json...}"
      const jsonMatch = messageText.match(/\{[^{}]*"url"[^{}]*\}|\{[^{}]*"spotify_id"[^{}]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        } catch {
          // Failed to parse extracted JSON
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
        // Has spotify_id but user not authenticated - try to get preview URL or show message
        console.log(
          '[BhajanPlayer] Has spotify_id but not authenticated, checking for preview URL'
        );
        if (hasPreviewUrl) {
          console.log('[BhajanPlayer] Using preview URL (not authenticated with Spotify)');
          setUseSpotify(false);
        } else {
          console.warn(
            '[BhajanPlayer] Only spotify_id available but user not authenticated - no preview URL'
          );
          // Still set track so it can be played if user authenticates later
          setUseSpotify(false);
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
  }, [messages, isAuthenticated, isReady, useSpotify]);

  // Auto-connect to Spotify when authenticated
  useEffect(() => {
    if (isAuthenticated && !isReady && !spotifyError) {
      connect();
    }
  }, [isAuthenticated, isReady, spotifyError, connect]);

  // Play track using Spotify SDK
  useEffect(() => {
    if (!currentTrack || !useSpotify || !currentTrack.spotify_id) {
      return;
    }

    // Try to play with Spotify SDK
    // If player is ready, play immediately
    // If not ready but authenticated, wait a bit and try
    const attemptPlay = async () => {
      if (isReady && deviceId) {
        try {
          await playTrack(currentTrack.spotify_id!);
        } catch (error) {
          console.error('Error playing track with Spotify:', error);
          // Fallback to preview URL
          setUseSpotify(false);
        }
      } else if (isAuthenticated && !isReady) {
        // Wait a bit for player to become ready
        setTimeout(() => {
          if (isReady && deviceId) {
            playTrack(currentTrack.spotify_id!).catch((error) => {
              console.error('Error playing track with Spotify (retry):', error);
              setUseSpotify(false);
            });
          } else {
            // Still not ready after wait, fallback to preview
            console.warn('Spotify player not ready after wait, using preview');
            setUseSpotify(false);
          }
        }, 2000);
      } else if (!isAuthenticated) {
        // Not authenticated, use preview
        setUseSpotify(false);
      }
    };

    attemptPlay();
  }, [currentTrack, useSpotify, isReady, deviceId, isAuthenticated, playTrack]);

  // Play audio when track URL changes (fallback mode - preview URLs)
  useEffect(() => {
    // Only use audio element if:
    // 1. We have a preview URL
    // 2. We're NOT using Spotify SDK
    // 3. Audio element exists
    if (!currentTrack?.url || useSpotify || !audioRef.current) {
      return;
    }

    const audio = audioRef.current;
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
      setCurrentTrack(null);
    };
    const handleError = (e: ErrorEvent) => {
      console.error('[BhajanPlayer] Error playing audio:', e);
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

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);

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
      // Capture ref at cleanup time
      const currentAudio = audioRef.current;
      if (currentAudio) {
        currentAudio.removeEventListener('ended', handleEnded);
        currentAudio.removeEventListener('error', handleError);
        currentAudio.removeEventListener('canplay', handleCanPlay);
        currentAudio.removeEventListener('loadeddata', handleLoadedData);
      }
    };
  }, [currentTrack?.url, useSpotify, currentTrack?.spotify_id, isAuthenticated]);

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

  // Don't render anything visible - just handle audio playback
  return (
    <>
      <audio ref={audioRef} preload="auto" />
    </>
  );
}
