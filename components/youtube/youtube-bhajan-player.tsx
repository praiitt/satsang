'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RemoteParticipant, RemoteTrackPublication, RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import {
  PauseIcon,
  PlayIcon,
  SpeakerHigh,
  SpeakerLow,
  SpeakerX,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';
import { MeditationMandalaVisualizer } from '@/components/visuals/meditation-mandala-visualizer';
import { useAgentControl } from '@/hooks/useAgentControl';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';

/**
 * YouTube Bhajan Player Component
 *
 * Uses YouTube IFrame Player API to play bhajan videos from LiveKit data channel messages.
 * Compatible with the same data format as Spotify player for seamless integration.
 */
export function YouTubeBhajanPlayer() {
  const messages = useChatMessages();
  const room = useRoomContext();
  const lastProcessedMessageRef = useRef<string>('');

  const {
    isReady,
    error,
    isPlaying,
    currentVideoId,
    playVideo,
    pause,
    resume,
    stop,
    setVolume,
    player,
  } = useYouTubePlayer();
  const [showControls, setShowControls] = useState(false);
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(50); // Default volume 50%
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // --- Agent sleep/wake + audio mute helpers ---
  const { publishAgentControl, agentIsSleeping } = useAgentControl();

  type AgentParticipant = RemoteParticipant & {
    isAgent?: boolean;
    audioTracks?: Map<string, RemoteTrackPublication>;
  };

  const setAgentAudioMuted = async (muted: boolean): Promise<void> => {
    if (!room) return;
    const participants = Array.from(room.remoteParticipants.values());
    const agent = participants.find((participant): participant is AgentParticipant => {
      const candidate = participant as AgentParticipant;
      return candidate.isAgent === true || /guruji|agent/i.test(String(candidate.identity ?? ''));
    });
    if (!agent) return;
    try {
      const pubs = Array.from(agent.audioTracks?.values?.() ?? []) as RemoteTrackPublication[];
      for (const pub of pubs) {
        // setSubscribed(false) effectively mutes the remote audio
        await pub.setSubscribed(!muted);
      }
      console.log('[YouTubeBhajanPlayer] Agent audio', muted ? 'muted' : 'unmuted');
    } catch (e) {
      console.warn('[YouTubeBhajanPlayer] Failed to toggle agent audio', e);
    }
  };

  // Helper to extract YouTube video ID from URL or return as-is if already an ID
  const extractYouTubeVideoId = (input: string | undefined): string | null => {
    if (!input) return null;
    // If it's already a video ID (11 characters, alphanumeric)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    // Extract from URL
    const match = input.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  // Listen for LiveKit data channel messages (same format as Spotify player)
  useEffect(() => {
    if (!room) return;

    const onData = (payload: Uint8Array, participant: unknown, kind: unknown, topic?: string) => {
      // Accept 'bhajan.track', 'bhajan.video', 'daily_satsang', and 'vani.search' topics
      if (
        topic !== undefined &&
        topic !== 'bhajan.track' &&
        topic !== 'bhajan.video' &&
        topic !== 'daily_satsang' &&
        topic !== 'vani.search'
      ) {
        return;
      }

      try {
        const text = new TextDecoder().decode(payload);
        console.log(
          '[YouTubeBhajanPlayer] 🔵 Decoded data (first 300 chars):',
          text.substring(0, 300)
        );

        const parsed = JSON.parse(text) as {
          type?: string; // For vani.results
          topic?: string; // For vani.results
          results?: Array<{
            videoId?: string;
            title?: string;
            channelTitle?: string;
            thumbnail?: string;
            url?: string;
          }>; // For vani.results
          url?: string;
          name?: string;
          artist?: string;
          spotify_id?: string;
          external_url?: string;
          youtube_id?: string;
          youtube_url?: string;
          videoId?: string; // For daily_satsang format
          action?: string; // For daily_satsang commands
          startSeconds?: number;
          message?: string;
        };

        console.log('[YouTubeBhajanPlayer] 🔵 Parsed JSON:', parsed);
        console.log('[YouTubeBhajanPlayer] 🔵 Available fields:', {
          type: parsed.type,
          hasYoutubeId: !!parsed.youtube_id,
          hasYoutubeUrl: !!parsed.youtube_url,
          hasVideoId: !!parsed.videoId,
          hasUrl: !!parsed.url,
          hasName: !!parsed.name,
          hasArtist: !!parsed.artist,
          hasSpotifyId: !!parsed.spotify_id,
          hasMessage: !!parsed.message,
          hasResults: !!parsed.results,
          resultsCount: parsed.results?.length || 0,
          allKeys: Object.keys(parsed),
        });

        // Handle vani.results format (array of videos)
        if (parsed.type === 'vani.results' && parsed.results && parsed.results.length > 0) {
          const firstResult = parsed.results[0];
          const videoId = firstResult.videoId || extractYouTubeVideoId(firstResult.url || '');
          const title = firstResult.title || parsed.topic || 'Vani';

          if (videoId) {
            console.log('[YouTubeBhajanPlayer] ✅ Playing vani from results:', {
              videoId,
              title,
              topic: parsed.topic,
            });
            setCurrentTrackName(title);
            setShowControls(true);
            playVideo(videoId, 0)
              .then(async () => {
                await setAgentAudioMuted(true);
                // Only sleep agent if not already sleeping (don't override manual sleep)
                if (!agentIsSleeping) {
                  await publishAgentControl('sleep', 'vani_playing');
                }
              })
              .catch((err) => {
                console.error('[YouTubeBhajanPlayer] Vani play error:', err);
              });
            return;
          } else {
            console.warn(
              '[YouTubeBhajanPlayer] ⚠️ No valid video ID in vani results:',
              firstResult
            );
          }
        }

        // Handle daily_satsang format (action-based commands)
        if (parsed.action === 'play' && parsed.videoId) {
          const videoId = extractYouTubeVideoId(parsed.videoId);
          if (videoId) {
            console.log('[YouTubeBhajanPlayer] ✅ Playing video from daily_satsang:', {
              videoId,
              name: parsed.name,
              startSeconds: parsed.startSeconds || 0,
            });
            setCurrentTrackName(parsed.name || 'Bhajan');
            setShowControls(true);
            playVideo(videoId, parsed.startSeconds || 0)
              .then(async () => {
                await setAgentAudioMuted(true);
                // Only sleep agent if not already sleeping (don't override manual sleep)
                if (!agentIsSleeping) {
                  await publishAgentControl('sleep', 'bhajan_playing');
                }
              })
              .catch((err) => {
                console.error('[YouTubeBhajanPlayer] Play error:', err);
              });
          }
          return;
        }

        if (parsed.action === 'pause') {
          pause()
            .then(async () => {
              await setAgentAudioMuted(false);
              await publishAgentControl('wake', 'bhajan_paused');
            })
            .catch((err) => {
              console.error('[YouTubeBhajanPlayer] Pause error:', err);
            });
          return;
        }

        if (parsed.action === 'resume') {
          resume()
            .then(async () => {
              await setAgentAudioMuted(true);
              // Only sleep agent if not already sleeping (don't override manual sleep)
              if (!agentIsSleeping) {
                await publishAgentControl('sleep', 'bhajan_resumed');
              }
            })
            .catch((err) => {
              console.error('[YouTubeBhajanPlayer] Resume error:', err);
            });
          return;
        }

        if (parsed.action === 'stop') {
          setShowControls(false);
          setCurrentTrackName(null);
          void setAgentAudioMuted(false);
          void publishAgentControl('wake', 'bhajan_stopped');
          return;
        }

        // Handle standard bhajan.track format (same as Spotify player)
        // Priority order for YouTube video ID:
        // 1. youtube_id (direct ID from backend)
        // 2. youtube_url (full URL from backend)
        // 3. videoId (daily_satsang format)
        // 4. url (fallback - might be YouTube URL)

        let youtubeId: string | undefined;
        let extractedVideoId: string | null = null;

        // Try youtube_id first (most direct)
        if (parsed.youtube_id) {
          youtubeId = parsed.youtube_id;
          console.log('[YouTubeBhajanPlayer] 📺 Using youtube_id field:', youtubeId);
          extractedVideoId = extractYouTubeVideoId(youtubeId);
        }
        // Try youtube_url second
        else if (parsed.youtube_url) {
          youtubeId = parsed.youtube_url;
          console.log('[YouTubeBhajanPlayer] 📺 Using youtube_url field:', youtubeId);
          extractedVideoId = extractYouTubeVideoId(youtubeId);
        }
        // Try videoId (daily_satsang format)
        else if (parsed.videoId) {
          youtubeId = parsed.videoId;
          console.log('[YouTubeBhajanPlayer] 📺 Using videoId field:', youtubeId);
          extractedVideoId = extractYouTubeVideoId(youtubeId);
        }
        // Try url as fallback (might be YouTube URL)
        else if (parsed.url) {
          console.log('[YouTubeBhajanPlayer] 📺 Checking url field for YouTube:', parsed.url);
          extractedVideoId = extractYouTubeVideoId(parsed.url);
          if (extractedVideoId) {
            youtubeId = parsed.url;
            console.log(
              '[YouTubeBhajanPlayer] 📺 Found YouTube ID in url field:',
              extractedVideoId
            );
          }
        }

        // Guard: ensure we have a valid YouTube video ID
        if (!extractedVideoId) {
          console.log('[YouTubeBhajanPlayer] ⚠️ Rejected - no valid YouTube video ID found', {
            hasYoutubeId: !!parsed.youtube_id,
            hasYoutubeUrl: !!parsed.youtube_url,
            hasVideoId: !!parsed.videoId,
            hasUrl: !!parsed.url,
            youtubeIdValue: youtubeId,
            parsedKeys: Object.keys(parsed),
          });
          // If there's no YouTube ID but there's a name, log for debugging
          if (parsed.name) {
            console.log(
              '[YouTubeBhajanPlayer] ℹ️  Received bhajan data but no YouTube ID. Spotify player may handle this.'
            );
          }
          return;
        }

        // Guard: ensure we have at least a name (required for display)
        if (!parsed.name) {
          console.log('[YouTubeBhajanPlayer] ⚠️ Rejected - missing name field', {
            videoId: extractedVideoId,
            parsedKeys: Object.keys(parsed),
          });
          return;
        }

        // Log all received data for debugging
        console.log('[YouTubeBhajanPlayer] ✅✅✅ Data event received - playing YouTube video', {
          topic,
          videoId: extractedVideoId,
          name: parsed.name,
          artist: parsed.artist,
          hasMessage: !!parsed.message,
          hasUrl: !!parsed.url,
          receivedFields: {
            youtube_id: parsed.youtube_id,
            youtube_url: parsed.youtube_url,
            spotify_id: parsed.spotify_id,
            name: parsed.name,
            artist: parsed.artist,
          },
        });

        // Store track name for display
        setCurrentTrackName(parsed.name || 'Bhajan');
        setShowControls(true);

        // Play the video
        console.log('[YouTubeBhajanPlayer] ▶️  Starting playback of video:', extractedVideoId);
        playVideo(extractedVideoId, 0)
          .then(async () => {
            await setAgentAudioMuted(true);
            // Only sleep agent if not already sleeping (don't override manual sleep)
            if (!agentIsSleeping) {
              await publishAgentControl('sleep', 'bhajan_playing');
            }
          })
          .catch((err) => {
            console.error('[YouTubeBhajanPlayer] ❌ Play error:', err);
            // Notify agent that playback failed
            void setAgentAudioMuted(false);
            void publishAgentControl('wake', 'bhajan_playback_failed');
          });
      } catch (error) {
        // Log errors for debugging
        console.error('[YouTubeBhajanPlayer] ❌ Error processing data event:', error);
        const textPreview = new TextDecoder().decode(payload).substring(0, 200);
        console.error('[YouTubeBhajanPlayer] Payload preview:', textPreview);
      }
    };

    // Register the listener
    console.log('[YouTubeBhajanPlayer] Registering DataReceived listener');
    room.on(RoomEvent.DataReceived, onData);
    console.log('[YouTubeBhajanPlayer] ✅ DataReceived listener registered');

    return () => {
      console.log('[YouTubeBhajanPlayer] Cleaning up data channel listener');
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, playVideo, pause, resume, agentIsSleeping, publishAgentControl]);

  // Also listen to chat messages for backward compatibility (extract YouTube URLs)
  useEffect(() => {
    if (!room) return;

    const agentMessages = messages.filter((m) => m.from?.isAgent);
    if (agentMessages.length === 0) return;

    const latestMessage = agentMessages[agentMessages.length - 1];
    if (latestMessage.id === lastProcessedMessageRef.current) return;

    lastProcessedMessageRef.current = latestMessage.id;
    const messageText = latestMessage.message.trim();

    // Try to extract YouTube video ID from message
    const youtubeRegex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = messageText.match(youtubeRegex);
    if (match && match[1]) {
      const videoId = match[1];
      console.log('[YouTubeBhajanPlayer] Found YouTube URL in chat message:', videoId);

      // Try to derive a friendly title from the message (remove the URL and trim)
      const derivedName = messageText.replace(match[0], '').replace(/\s+/g, ' ').trim();
      const displayName = derivedName.length > 0 ? derivedName : 'Bhajan';

      setCurrentTrackName(displayName);
      setShowControls(true);

      playVideo(videoId)
        .then(async () => {
          await setAgentAudioMuted(true);
          // Only sleep agent if not already sleeping (don't override manual sleep)
          if (!agentIsSleeping) {
            await publishAgentControl('sleep', 'bhajan_playing');
          }
        })
        .catch((err) => {
          console.error('[YouTubeBhajanPlayer] Play from chat error:', err);
        });
    }
  }, [messages, playVideo, agentIsSleeping, publishAgentControl]);

  // Update showControls based on playing state
  useEffect(() => {
    if (isPlaying) {
      setShowControls(true);
    }
  }, [isPlaying]);

  // Hide controls if video stopped and not playing
  useEffect(() => {
    if (!currentVideoId && !isPlaying) {
      setShowControls(false);
      setCurrentTrackName(null);
    }
  }, [currentVideoId, isPlaying]);

  // Listen for room disconnect to stop bhajan playback and clear all data
  useEffect(() => {
    if (!room) return;

    const handleDisconnected = async () => {
      console.log('[YouTubeBhajanPlayer] Room disconnected - clearing all player data');
      try {
        // Stop the video player
        await stop();
        // Clear all UI state
        setShowControls(false);
        setCurrentTrackName(null);
        // Reset volume and mute state
        setVolumeState(50);
        setIsMuted(false);
        // Unmute agent audio
        await setAgentAudioMuted(false);
        // Wake agent if sleeping
        await publishAgentControl('wake', 'room_disconnected');
        console.log('[YouTubeBhajanPlayer] ✅ All player data cleared');
      } catch (err) {
        console.error('[YouTubeBhajanPlayer] Error clearing player data on disconnect:', err);
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, stop, setAgentAudioMuted, publishAgentControl]);

  // Listen for YouTube video ended/paused events to wake agent
  useEffect(() => {
    const handleVideoEnded = async () => {
      console.log('[YouTubeBhajanPlayer] Video ended - waking agent');
      await setAgentAudioMuted(false);
      await publishAgentControl('wake', 'video_ended');
    };

    const handleVideoPaused = async () => {
      // Note: We already handle pause in the pause button click handler
      // This is a backup in case video pauses for other reasons
      console.log('[YouTubeBhajanPlayer] Video paused - waking agent');
      await setAgentAudioMuted(false);
      await publishAgentControl('wake', 'video_paused');
    };

    window.addEventListener('youtube-video-ended', handleVideoEnded);
    window.addEventListener('youtube-video-paused', handleVideoPaused);

    return () => {
      window.removeEventListener('youtube-video-ended', handleVideoEnded);
      window.removeEventListener('youtube-video-paused', handleVideoPaused);
    };
  }, [setAgentAudioMuted, publishAgentControl]);

  // Notify agent when YouTube error occurs (especially error 150 - embedding not allowed)
  useEffect(() => {
    if (error && error.includes('embedding')) {
      console.log('[YouTubeBhajanPlayer] ⚠️ Video embedding error detected, notifying agent');
      // Notify agent that the video failed to play due to embedding restrictions
      void setAgentAudioMuted(false);
      void publishAgentControl('wake', 'video_embedding_error');
    }
  }, [error, setAgentAudioMuted, publishAgentControl]);

  // Get current volume from player when it's ready
  useEffect(() => {
    if (player && isReady) {
      try {
        const currentVol = player.getVolume();
        setVolumeState(currentVol);
        setIsMuted(player.isMuted());
      } catch (err) {
        // Ignore errors
      }
    }
  }, [player, isReady]);

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);
    setVolume(clampedVolume);
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false);
      try {
        player?.unMute();
      } catch (err) {
        // Ignore errors
      }
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (!player) return;
    try {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.error('[YouTubeBhajanPlayer] Mute toggle error:', err);
    }
  };

  // Handle close/stop
  const handleClose = async () => {
    await stop();
    setShowControls(false);
    setCurrentTrackName(null);
    await setAgentAudioMuted(false);
    await publishAgentControl('wake', 'player_closed');
  };

  const enableMandalaVisualizer = useMemo(() => {
    if (typeof window === 'undefined') return true;
    const globalWindow = window as unknown as { NEXT_PUBLIC_ENABLE_MANDALA_VISUALIZER?: string };
    const flag = globalWindow.NEXT_PUBLIC_ENABLE_MANDALA_VISUALIZER;
    if (typeof flag === 'string') {
      return flag !== 'false';
    }
    return true;
  }, []);

  const showMandala = enableMandalaVisualizer && (isPlaying || !!currentVideoId);

  if (!isReady && !error) {
    return null; // Loading
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border-destructive/20 mx-3 mb-2 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="text-destructive text-sm font-semibold">⚠️ Playback Error</div>
            <div className="text-destructive/80 mt-1 text-xs">{error}</div>
            {error.includes('embedding') && (
              <div className="text-destructive/70 mt-2 text-xs">
                This video cannot be played here. Please try requesting the bhajan again or ask for
                a different one.
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              // Clear error and notify agent that video failed
              await setAgentAudioMuted(false);
              await publishAgentControl('wake', 'video_failed');
              setShowControls(false);
              setCurrentTrackName(null);
              // Reset error by stopping the player
              await stop();
            }}
            className="text-destructive hover:text-destructive/80 h-8 px-2 text-xs"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show controls when music is playing or when we have a current video
  if (!showControls && !currentVideoId) {
    return null;
  }

  return (
    <div className="mb-3">
      {showMandala && <MeditationMandalaVisualizer isActive={isPlaying} />}
      <div className="bg-primary/10 border-primary/30 flex items-center gap-2 rounded-xl border-2 p-3 shadow-md">
        <div className="min-w-0 flex-1">
          {currentTrackName && (
            <div className="text-foreground truncate text-sm font-semibold">{currentTrackName}</div>
          )}
          <div className="text-muted-foreground text-xs">
            {isPlaying ? '▶️ Playing...' : '⏸️ Paused'}
          </div>
        </div>

        {/* Volume Control */}
        <div className="relative flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMuteToggle}
            className="h-9 w-9 p-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <SpeakerX className="h-5 w-5" weight="fill" />
            ) : volume < 50 ? (
              <SpeakerLow className="h-5 w-5" weight="fill" />
            ) : (
              <SpeakerHigh className="h-5 w-5" weight="fill" />
            )}
          </Button>

          {showVolumeSlider && (
            <div className="bg-background border-input absolute right-0 bottom-full mb-2 rounded-lg border p-3 shadow-lg">
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-24"
                title={`Volume: ${volume}%`}
              />
              <div className="text-muted-foreground mt-1 text-center text-xs">{volume}%</div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="h-9 w-9 p-0"
            title="Volume"
          >
            <div className="text-muted-foreground text-xs font-semibold">{volume}%</div>
          </Button>
        </div>

        {/* Play/Pause Button */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                pause()
                  .then(async () => {
                    await setAgentAudioMuted(false);
                    await publishAgentControl('wake', 'bhajan_paused');
                  })
                  .catch((err) => {
                    console.error('[YouTubeBhajanPlayer] Pause error:', err);
                  });
              }}
              className="h-12 w-12 p-0 shadow-lg transition-transform hover:scale-105"
              title="Pause"
            >
              <PauseIcon className="h-6 w-6" weight="fill" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                resume()
                  .then(async () => {
                    await setAgentAudioMuted(true);
                    // Only sleep agent if not already sleeping (don't override manual sleep)
                    if (!agentIsSleeping) {
                      await publishAgentControl('sleep', 'bhajan_resumed');
                    }
                  })
                  .catch((err) => {
                    console.error('[YouTubeBhajanPlayer] Resume error:', err);
                  });
              }}
              className="h-12 w-12 p-0 shadow-lg transition-transform hover:scale-105"
              title="Resume"
              disabled={!currentVideoId}
            >
              <PlayIcon className="h-6 w-6" weight="fill" />
            </Button>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground h-12 w-12 p-0 transition-colors"
            title="Close Player"
          >
            <X className="h-5 w-5" weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );
}
