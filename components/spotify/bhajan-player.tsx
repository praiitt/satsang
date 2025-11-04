'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';

interface BhajanTrackInfo {
  url?: string;
  name?: string;
  artist?: string;
  message?: string;
}

/**
 * Simple Bhajan Player Component
 * 
 * Parses agent messages for bhajan URLs and plays them using HTML5 audio.
 */
export function BhajanPlayer() {
  const messages = useChatMessages();
  const [currentTrack, setCurrentTrack] = useState<BhajanTrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageRef = useRef<string>('');

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
      
      // Check if it's a bhajan response (has url, preview_url, or spotify_id)
      if (parsed.url || parsed.preview_url) {
        trackInfo = {
          url: parsed.url || parsed.preview_url,
          name: parsed.name,
          artist: parsed.artist,
          message: parsed.message,
        };
      }
    } catch {
      // Not JSON, ignore
    }

    if (trackInfo && trackInfo.url) {
      setCurrentTrack(trackInfo);
      setIsPlaying(true);
      lastProcessedMessageRef.current = latestMessage.id;
    }
  }, [messages]);

  // Play audio when track URL changes
  useEffect(() => {
    if (!currentTrack?.url || !audioRef.current) {
      return;
    }

    const audio = audioRef.current;
    
    // Set up audio element
    audio.src = currentTrack.url;
    audio.volume = 0.8;

    // Event handlers
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
    };
    const handleError = (e: ErrorEvent) => {
      console.error('Error playing audio:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Auto-play
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    });

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack?.url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
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
