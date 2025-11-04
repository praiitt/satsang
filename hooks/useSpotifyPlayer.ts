import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatMessages } from './useChatMessages';
import type { ReceivedChatMessage } from '@livekit/components-react';

interface BhajanTrackInfo {
  name?: string;
  artist?: string;
  preview_url?: string | null;
  spotify_id?: string;
  external_url?: string;
  message?: string;
}

export function useSpotifyPlayer() {
  const messages = useChatMessages();
  const [currentTrack, setCurrentTrack] = useState<BhajanTrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastProcessedMessageRef = useRef<string>('');

  // Parse agent messages for bhajan playback info
  const parseBhajanMessage = useCallback((message: string): BhajanTrackInfo | null => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(message);
      
      // Check if it's a bhajan response (has spotify_id or preview_url)
      if (parsed.spotify_id || parsed.preview_url) {
        return {
          name: parsed.name,
          artist: parsed.artist,
          preview_url: parsed.preview_url,
          spotify_id: parsed.spotify_id,
          external_url: parsed.external_url,
          message: parsed.message,
        };
      }
    } catch {
      // Not JSON, ignore
    }
    return null;
  }, []);

  // Watch for new agent messages containing bhajan info
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

    const trackInfo = parseBhajanMessage(latestMessage.message);
    if (trackInfo) {
      setCurrentTrack(trackInfo);
      setIsPlaying(true);
      lastProcessedMessageRef.current = latestMessage.id;
    }
  }, [messages, parseBhajanMessage]);

  const stopPlayback = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  return {
    currentTrack,
    isPlaying,
    stopPlayback,
    trackId: currentTrack?.spotify_id || null,
    previewUrl: currentTrack?.preview_url || null,
  };
}

