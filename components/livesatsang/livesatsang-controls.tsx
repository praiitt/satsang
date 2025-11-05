'use client';

import React, { useEffect, useState } from 'react';
import { Room, Track } from 'livekit-client';
import {
  ControlBar,
  DisconnectButton,
  MediaDeviceMenu,
  TrackToggle,
} from '@livekit/components-react';

interface LiveSatsangControlsProps {
  room: Room;
  participantName: string;
  isHost: boolean;
  onLeave: () => void;
}

export function LiveSatsangControls({
  room,
  participantName,
  isHost,
  onLeave,
}: LiveSatsangControlsProps) {
  const [gurujiJoined, setGurujiJoined] = useState(false);

  // Check if Guruji (agent) is in the room
  const checkGurujiStatus = () => {
    if (!room.remoteParticipants) {
      setGurujiJoined(false);
      return false;
    }
    const remoteParticipants = Array.from(room.remoteParticipants.values());
    const hasAgent = remoteParticipants.some(
      (p) => p.identity.includes('guruji') || p.identity.includes('agent')
    );
    setGurujiJoined(hasAgent);
    return hasAgent;
  };

  // Listen for participant updates
  useEffect(() => {
    checkGurujiStatus();

    room.on('participantConnected', checkGurujiStatus);
    room.on('participantDisconnected', checkGurujiStatus);

    return () => {
      room.off('participantConnected', checkGurujiStatus);
      room.off('participantDisconnected', checkGurujiStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const handleInviteGuruji = async () => {
    try {
      const response = await fetch('/api/livesatsang/agent-token', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to invite Guruji');
      }

      const data = await response.json();

      if (data.success) {
        // Show success message
        alert(data.message || 'Guruji has been invited to join LiveSatsang!');
        setGurujiJoined(true);

        // Note: The agent will appear in the room automatically when:
        // 1. The agent worker is running with agent_name='guruji'
        // 2. The agent worker is watching for rooms with this agent config
        // The agent's video/audio will appear in the participant grid automatically
      } else {
        throw new Error(data.message || 'Failed to invite Guruji');
      }
    } catch (error) {
      console.error('Error inviting Guruji:', error);
      alert(error instanceof Error ? error.message : 'Failed to invite Guruji. Please try again.');
    }
  };

  const handleMuteAll = async () => {
    // Note: Remote participants control their own audio
    // This is a placeholder for future server-side mute functionality
    alert(
      'Mute all functionality requires server-side implementation. Please ask participants to mute themselves.'
    );
  };

  const handleUnmuteAll = async () => {
    // Note: Remote participants control their own audio
    // This is a placeholder for future server-side unmute functionality
    alert(
      'Unmute all functionality requires server-side implementation. Please ask participants to unmute themselves.'
    );
  };

  // Safely get participant count using numParticipants
  const participantCount = room.numParticipants ?? 1; // Includes local participant

  return (
    <div
      className="border-border bg-card fixed right-0 bottom-0 left-0 z-50 border-t shadow-2xl"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="space-y-3 p-4 sm:space-y-4 sm:p-5 md:p-6">
        {/* Room Info */}
        <div className="border-border bg-muted/50 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5">
          <span className="text-foreground text-sm font-medium">कक्ष:</span>
          <span className="text-foreground text-sm font-bold">{room.name || 'LiveSatsang'}</span>
          <span className="text-muted-foreground mx-2">•</span>
          <span className="text-foreground text-sm font-medium">प्रतिभागी:</span>
          <span className="text-primary text-sm font-bold">{participantCount}</span>
        </div>

        {/* Top Row: User Info & Guruji Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold sm:h-12 sm:w-12 sm:text-lg">
              {participantName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-base font-semibold sm:text-lg">
                {participantName}
              </p>
              {isHost && <p className="text-primary text-xs font-medium sm:text-sm">👑 Host</p>}
            </div>
          </div>

          {/* Guruji Status - Mobile optimized */}
          {!gurujiJoined ? (
            <button
              onClick={handleInviteGuruji}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all active:scale-95 sm:px-5 sm:py-3 sm:text-base"
              title="गुरुजी को आमंत्रित करें"
            >
              <span className="text-lg">🙏</span>
              <span className="hidden sm:inline">आमंत्रित करें</span>
            </button>
          ) : (
            <div className="bg-primary/20 border-primary/30 text-primary flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold sm:px-5 sm:py-3 sm:text-base">
              <span className="text-lg">✅</span>
              <span className="hidden sm:inline">गुरुजी</span>
            </div>
          )}
        </div>

        {/* Host Controls - compact pills (above toggles) */}
        {isHost && (
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={handleMuteAll}
              className="border-destructive/30 bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors active:scale-95 sm:text-sm"
              title="सभी को म्यूट करें"
            >
              <span className="text-base">🔇</span>
              <span>सभी को म्यूट</span>
            </button>
            <button
              onClick={handleUnmuteAll}
              className="border-primary/30 bg-primary/20 text-primary hover:bg-primary/30 flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors active:scale-95 sm:text-sm"
              title="सभी को अनम्यूट करें"
            >
              <span className="text-base">🔊</span>
              <span>सभी को अनम्यूट</span>
            </button>
          </div>
        )}

        {/* Controls Row - always last, closest to the bottom edge */}
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <ControlBar className="flex items-center gap-3 sm:gap-4">
            <div className="border-border bg-muted/50 flex items-center gap-2 rounded-xl border p-1.5 sm:gap-3">
              <TrackToggle
                source={Track.Source.Microphone}
                className="h-11 w-11 rounded-lg sm:h-12 sm:w-12"
              />
              <TrackToggle
                source={Track.Source.Camera}
                className="h-11 w-11 rounded-lg sm:h-12 sm:w-12"
              />
            </div>
            <MediaDeviceMenu
              kind="audioinput"
              className="border-border bg-muted/50 hover:bg-muted h-11 w-11 rounded-lg border transition-colors sm:h-12 sm:w-12"
            />
            <MediaDeviceMenu
              kind="videoinput"
              className="border-border bg-muted/50 hover:bg-muted h-11 w-11 rounded-lg border transition-colors sm:h-12 sm:w-12"
            />
            <DisconnectButton
              onClick={onLeave}
              className="border-destructive/50 bg-destructive/30 hover:bg-destructive/40 h-11 w-11 rounded-lg border transition-colors sm:h-12 sm:w-12"
            />
          </ControlBar>
        </div>
      </div>
    </div>
  );
}
