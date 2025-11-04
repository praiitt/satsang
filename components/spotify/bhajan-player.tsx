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

    // Try to parse as JSON
    let trackInfo: BhajanTrackInfo | null = null;
    try {
      const parsed = JSON.parse(latestMessage.message);

      // Check if it's an error response
      if (parsed.error) {
        // Error message from agent
        console.warn('Bhajan error from agent:', parsed.error);
        // Log available bhajans if provided
        if (parsed.available_bhajans) {
          console.log('Available bhajans:', parsed.available_bhajans);
        }
        return;
      }

      // Agent returns one of these formats:
      // 1. Success with preview: { url, name, artist, spotify_id, external_url, message }
      // 2. Success without preview: { url: null, name, artist, spotify_id, external_url, message }
      // 3. Error: { error, available_bhajans?, external_url? }

      // Check if it's a valid track response
      // Must have at least one of: url, preview_url, or spotify_id
      const hasUrl = parsed.url || parsed.preview_url;
      const hasSpotifyId = parsed.spotify_id;

      if (hasUrl || hasSpotifyId) {
        trackInfo = {
          // url can be preview_url or null - use whatever is available
          url: parsed.url || parsed.preview_url || undefined,
          name: parsed.name || undefined,
          artist: parsed.artist || undefined,
          message: parsed.message || undefined,
          spotify_id: parsed.spotify_id || undefined,
          external_url: parsed.external_url || undefined,
        };

        console.log('Bhajan track info received:', {
          name: trackInfo.name,
          artist: trackInfo.artist,
          hasUrl: !!trackInfo.url,
          hasSpotifyId: !!trackInfo.spotify_id,
        });
      } else {
        console.warn('Invalid bhajan response format:', parsed);
      }
    } catch (err) {
      // Not JSON, ignore - this is normal for regular chat messages
      // Only log if it looks like it might be JSON
      if (latestMessage.message.trim().startsWith('{')) {
        console.warn('Failed to parse bhajan JSON:', err, latestMessage.message);
      }
    }

    if (trackInfo) {
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
        console.log('Using Spotify SDK for playback (has spotify_id:', trackInfo.spotify_id, ')');
        setUseSpotify(true);
      } else if (!hasSpotifyId && hasPreviewUrl) {
        // No spotify_id but has preview URL - use preview
        console.log('Using preview URL (no spotify_id available)');
        setUseSpotify(false);
      } else if (!hasSpotifyId && !hasPreviewUrl) {
        // No playback options available
        console.warn('No playback options available - no spotify_id or preview_url');
        setUseSpotify(false);
      }
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
    audio.src = currentTrack.url;
    audio.volume = 0.8;

    // Event handlers
    const handleEnded = () => {
      setCurrentTrack(null);
    };
    const handleError = (e: ErrorEvent) => {
      console.error('Error playing audio:', e);
      // If preview fails and we have Spotify ID, try Spotify
      if (trackSpotifyId && isAuthenticated) {
        setUseSpotify(true);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Auto-play
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      // If preview fails and we have Spotify ID, try Spotify
      if (trackSpotifyId && isAuthenticated) {
        setUseSpotify(true);
      }
    });

    return () => {
      // Capture ref at cleanup time
      const currentAudio = audioRef.current;
      if (currentAudio) {
        currentAudio.removeEventListener('ended', handleEnded);
        currentAudio.removeEventListener('error', handleError);
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
