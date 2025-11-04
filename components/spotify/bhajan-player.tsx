'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { SpotifyPlayer } from './spotify-player';

/**
 * Combined Bhajan Player Component
 * 
 * Handles both Spotify SDK playback (for full tracks) and
 * preview URL playback (for 30-second previews).
 */
export function BhajanPlayer() {
  const { currentTrack, trackId, previewUrl, stopPlayback } = useSpotifyPlayer();
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle preview URL playback
  useEffect(() => {
    if (!previewUrl || trackId) {
      // If we have Spotify ID, use SDK instead of preview
      return;
    }

    // Create audio element for preview
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        setIsPreviewPlaying(false);
        stopPlayback();
      });
    }

    const audio = audioRef.current;
    audio.src = previewUrl;
    audio.play().catch((error) => {
      console.error('Error playing preview:', error);
      setIsPreviewPlaying(false);
    });
    setIsPreviewPlaying(true);

    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [previewUrl, trackId, stopPlayback]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Render Spotify SDK player for full tracks
  if (trackId && !previewUrl) {
    return (
      <SpotifyPlayer
        trackId={trackId}
        trackName={currentTrack?.name}
        artist={currentTrack?.artist}
        onPlaybackEnded={stopPlayback}
      />
    );
  }

  // Preview URL is handled by audio element (no visible component needed)
  return null;
}

