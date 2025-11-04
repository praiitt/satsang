'use client';

import { useEffect, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { useLocalParticipant, useRemoteParticipants } from '@livekit/components-react';

interface ParticipantListProps {
  room: Room;
}

export function ParticipantList({ room }: ParticipantListProps) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [allParticipants, setAllParticipants] = useState<Array<{
    identity: string;
    name: string;
    isLocal: boolean;
    hasVideo: boolean;
    hasAudio: boolean;
  }>>([]);

  useEffect(() => {
    const updateParticipants = () => {
      const participants: Array<{
        identity: string;
        name: string;
        isLocal: boolean;
        hasVideo: boolean;
        hasAudio: boolean;
      }> = [];

      // Add local participant
      if (localParticipant) {
        const videoTracks = localParticipant.videoTracks ? Array.from(localParticipant.videoTracks.values()) : [];
        const audioTracks = localParticipant.audioTracks ? Array.from(localParticipant.audioTracks.values()) : [];
        const videoTrack = videoTracks[0];
        const audioTrack = audioTracks[0];
        participants.push({
          identity: localParticipant.identity,
          name: localParticipant.name || 'You',
          isLocal: true,
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack && !videoTrack?.publication?.isMuted,
        });
      }

      // Add remote participants
      remoteParticipants.forEach((participant) => {
        const videoTracks = participant.videoTracks ? Array.from(participant.videoTracks.values()) : [];
        const audioTracks = participant.audioTracks ? Array.from(participant.audioTracks.values()) : [];
        const videoTrack = videoTracks[0];
        const audioTrack = audioTracks[0];
        participants.push({
          identity: participant.identity,
          name: participant.name || participant.identity,
          isLocal: false,
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack && !videoTrack?.publication?.isMuted,
        });
      });

      setAllParticipants(participants);
      console.log(`📋 Participant list updated:`, participants);
    };

    updateParticipants();

    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.TrackSubscribed, updateParticipants);
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants);

    return () => {
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.TrackSubscribed, updateParticipants);
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants);
    };
  }, [room, localParticipant, remoteParticipants]);

  if (allParticipants.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs rounded-xl bg-black/80 backdrop-blur-xl p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Participants ({allParticipants.length})</h3>
        <span className="text-xs text-white/60">Room: {room.name}</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {allParticipants.map((participant) => (
          <div
            key={participant.identity}
            className="flex items-center gap-2 rounded-lg bg-white/5 p-2"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-xs font-bold text-white">
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {participant.name}
                {participant.isLocal && (
                  <span className="ml-1 text-xs text-white/60">(You)</span>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/60">
                {participant.hasVideo && <span>📹</span>}
                {participant.hasAudio && <span>🎤</span>}
                {!participant.hasVideo && !participant.hasAudio && (
                  <span className="text-white/40">No media</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

