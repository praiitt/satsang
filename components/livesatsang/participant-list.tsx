'use client';

import { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { useLocalParticipant, useRemoteParticipants } from '@livekit/components-react';

interface ParticipantListProps {
  room: Room;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ParticipantList({ room, isOpen = true, onClose }: ParticipantListProps) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [allParticipants, setAllParticipants] = useState<
    Array<{
      identity: string;
      name: string;
      isLocal: boolean;
      hasVideo: boolean;
      hasAudio: boolean;
    }>
  >([]);

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
        const trackPublications = Array.from(localParticipant.trackPublications.values());
        const videoTrack = trackPublications.find((pub) => pub.kind === 'video');
        const audioTrack = trackPublications.find((pub) => pub.kind === 'audio');
        participants.push({
          identity: localParticipant.identity,
          name: localParticipant.name || 'You',
          isLocal: true,
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack && !audioTrack.isMuted,
        });
      }

      // Add remote participants
      remoteParticipants.forEach((participant) => {
        const trackPublications = Array.from(participant.trackPublications.values());
        const videoTrack = trackPublications.find((pub) => pub.kind === 'video');
        const audioTrack = trackPublications.find((pub) => pub.kind === 'audio');
        participants.push({
          identity: participant.identity,
          name: participant.name || participant.identity,
          isLocal: false,
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack && !audioTrack.isMuted,
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

  if (allParticipants.length === 0 || !isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile bottom sheet */}
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      <div className="fixed right-0 bottom-0 left-0 z-50 rounded-t-2xl bg-card border-t border-border p-4 shadow-2xl md:hidden">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">प्रतिभागी ({allParticipants.length})</h3>
          <button
            aria-label="प्रतिभागी सूची बंद करें"
            className="rounded-lg bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
            onClick={onClose}
          >
            बंद करें
          </button>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {allParticipants.map((participant) => {
            const isAgent = participant.identity.includes('agent') || participant.identity.includes('guruji');
            return (
              <div
                key={participant.identity}
                className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground flex items-center gap-1">
                    {isAgent && <span>🙏</span>}
                    <span>{participant.name}</span>
                    {participant.isLocal && <span className="ml-1 text-xs text-muted-foreground">(आप)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {participant.hasVideo && <span>📹</span>}
                    {participant.hasAudio && <span>🎤</span>}
                    {!participant.hasVideo && !participant.hasAudio && (
                      <span className="text-muted-foreground/60">मीडिया नहीं</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop floating panel */}
      <div className="fixed top-4 right-4 z-40 hidden max-w-xs rounded-xl bg-card border border-border p-4 shadow-2xl md:block">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">प्रतिभागी ({allParticipants.length})</h3>
          <span className="text-xs text-muted-foreground">कक्ष: {room.name}</span>
        </div>
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {allParticipants.map((participant) => {
            const isAgent = participant.identity.includes('agent') || participant.identity.includes('guruji');
            return (
              <div
                key={participant.identity}
                className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground flex items-center gap-1">
                    {isAgent && <span>🙏</span>}
                    <span>{participant.name}</span>
                    {participant.isLocal && <span className="ml-1 text-xs text-muted-foreground">(आप)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {participant.hasVideo && <span>📹</span>}
                    {participant.hasAudio && <span>🎤</span>}
                    {!participant.hasVideo && !participant.hasAudio && (
                      <span className="text-muted-foreground/60">मीडिया नहीं</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
