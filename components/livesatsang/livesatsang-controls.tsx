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
      className="fixed right-0 bottom-0 left-0 z-50 bg-gradient-to-t from-black/95 via-black/90 to-black/80 shadow-2xl backdrop-blur-xl"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-5 md:p-6">
        {/* Room Info */}
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 backdrop-blur-sm">
          <span className="text-sm font-medium text-white/80">कक्ष:</span>
          <span className="text-sm font-bold text-white">{room.name || 'LiveSatsang'}</span>
          <span className="mx-2 text-white/40">•</span>
          <span className="text-sm font-medium text-white/80">प्रतिभागी:</span>
          <span className="text-sm font-bold text-green-400">{participantCount}</span>
        </div>

        {/* Top Row: User Info & Guruji Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-base font-bold text-white sm:h-12 sm:w-12 sm:text-lg">
              {participantName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white sm:text-lg">
                {participantName}
              </p>
              {isHost && <p className="text-xs font-medium text-yellow-300 sm:text-sm">👑 Host</p>}
            </div>
          </div>

          {/* Guruji Status - Mobile optimized */}
          {!gurujiJoined ? (
            <button
              onClick={handleInviteGuruji}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 sm:px-5 sm:py-3 sm:text-base"
              title="गुरुजी को आमंत्रित करें"
            >
              <span className="text-lg">🙏</span>
              <span className="hidden sm:inline">आमंत्रित करें</span>
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-green-500/20 px-4 py-2.5 text-sm font-semibold text-green-300 backdrop-blur-sm sm:px-5 sm:py-3 sm:text-base">
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
              className="flex items-center justify-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-red-500/30 active:scale-95 sm:text-sm"
              title="सभी को म्यूट करें"
            >
              <span className="text-base">🔇</span>
              <span>सभी को म्यूट</span>
            </button>
            <button
              onClick={handleUnmuteAll}
              className="flex items-center justify-center gap-2 rounded-full bg-green-500/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-green-500/30 active:scale-95 sm:text-sm"
              title="सभी को अनम्यूट करें"
            >
              <span className="text-base">🔊</span>
              <span>सभी को अनम्यूट</span>
            </button>
          </div>
        )}

        {/* Controls Row - always last, closest to the bottom edge */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <ControlBar className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1 backdrop-blur-sm sm:gap-3">
              <TrackToggle
                source={Track.Source.Microphone}
                className="h-12 w-12 rounded-lg sm:h-14 sm:w-14"
              />
              <TrackToggle
                source={Track.Source.Camera}
                className="h-12 w-12 rounded-lg sm:h-14 sm:w-14"
              />
            </div>
            <MediaDeviceMenu
              kind="audioinput"
              className="h-12 w-12 rounded-lg bg-white/10 sm:h-14 sm:w-14"
            />
            <MediaDeviceMenu
              kind="videoinput"
              className="h-12 w-12 rounded-lg bg-white/10 sm:h-14 sm:w-14"
            />
            <DisconnectButton
              onClick={onLeave}
              className="h-12 w-12 rounded-lg bg-red-500/20 hover:bg-red-500/30 sm:h-14 sm:w-14"
            />
          </ControlBar>
        </div>
      </div>
    </div>
  );
}
