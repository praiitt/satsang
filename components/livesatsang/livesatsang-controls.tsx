'use client';

import React, { useState, useEffect } from 'react';
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
  const [mutedParticipants, setMutedParticipants] = useState<Set<string>>(new Set());
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
  }, [room]);

  const handleInviteGuruji = async () => {
    try {
      const response = await fetch('/api/livesatsang/agent-token', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to invite Guruji');
      }

      const { serverUrl, agentToken } = await response.json();

      // Connect agent to room (this would typically be done server-side via LiveKit API)
      // For now, we'll just notify that the invitation was sent
      alert('Guruji has been invited to join LiveSatsang!');
      setGurujiJoined(true);
    } catch (error) {
      console.error('Error inviting Guruji:', error);
      alert('Failed to invite Guruji. Please try again.');
    }
  };

  const handleMuteAll = async () => {
    // Mute all remote participants (except self and agent)
    if (!room.remoteParticipants) return;
    const participants = Array.from(room.remoteParticipants.values());
    
    for (const participant of participants) {
      // Skip muting the agent (Guruji)
      if (participant.identity.includes('guruji') || participant.identity.includes('agent')) {
        continue;
      }

      const audioTrack = Array.from(participant.audioTracks.values())[0]?.track;
      if (audioTrack) {
        await audioTrack.setEnabled(false);
        setMutedParticipants((prev) => new Set(prev).add(participant.identity));
      }
    }

    alert('All participants have been muted');
  };

  const handleUnmuteAll = async () => {
    if (!room.remoteParticipants) return;
    const participants = Array.from(room.remoteParticipants.values());
    
    for (const participant of participants) {
      if (participant.identity.includes('guruji') || participant.identity.includes('agent')) {
        continue;
      }

      const audioTrack = Array.from(participant.audioTracks.values())[0]?.track;
      if (audioTrack) {
        await audioTrack.setEnabled(true);
      }
    }

    setMutedParticipants(new Set());
    alert('All participants have been unmuted');
  };

  // Safely get participant count - handle cases where room.participants might be undefined
  const participantCount = (room.participants?.size ?? 0) + 1; // +1 for local participant
  const remoteParticipants = Array.from(room.remoteParticipants?.values() ?? []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 via-black/90 to-black/80 backdrop-blur-xl shadow-2xl">
      <div className="space-y-4 p-4 sm:p-5 md:p-6">
        {/* Room Info */}
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 backdrop-blur-sm">
          <span className="text-sm font-medium text-white/80">Room:</span>
          <span className="text-sm font-bold text-white">{room.name || 'LiveSatsang'}</span>
          <span className="mx-2 text-white/40">•</span>
          <span className="text-sm font-medium text-white/80">Participants:</span>
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
              {isHost && (
                <p className="text-xs font-medium text-yellow-300 sm:text-sm">
                  👑 Host
                </p>
              )}
            </div>
          </div>

          {/* Guruji Status - Mobile optimized */}
          {!gurujiJoined ? (
            <button
              onClick={handleInviteGuruji}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 sm:px-5 sm:py-3 sm:text-base"
              title="Invite Guruji to join LiveSatsang"
            >
              <span className="text-lg">🙏</span>
              <span className="hidden sm:inline">Invite</span>
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-green-500/20 px-4 py-2.5 text-sm font-semibold text-green-300 backdrop-blur-sm sm:px-5 sm:py-3 sm:text-base">
              <span className="text-lg">✅</span>
              <span className="hidden sm:inline">Guruji</span>
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Standard LiveKit Controls - Mobile optimized */}
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

          {/* Host Controls - Stack on mobile, horizontal on desktop */}
          {isHost && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="hidden h-px flex-1 bg-white/10 sm:block" />
              <button
                onClick={handleMuteAll}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all active:scale-95 hover:bg-red-500/30 sm:px-5 sm:text-base"
                title="Mute all participants"
              >
                <span className="text-lg">🔇</span>
                <span>Mute All</span>
              </button>
              <button
                onClick={handleUnmuteAll}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-500/20 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all active:scale-95 hover:bg-green-500/30 sm:px-5 sm:text-base"
                title="Unmute all participants"
              >
                <span className="text-lg">🔊</span>
                <span>Unmute All</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
