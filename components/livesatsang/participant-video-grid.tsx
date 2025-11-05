'use client';

import { useMemo } from 'react';
import { Track } from 'livekit-client';
import {
  type TrackReference,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from '@livekit/components-react';

export function ParticipantVideoGrid() {
  const { localParticipant } = useLocalParticipant();

  // Get all video tracks from all participants using useTracks hook
  // This automatically subscribes to remote tracks
  // onlySubscribed: false includes all available tracks (both local published and remote subscribed)
  const allVideoTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  // Subscribe to audio tracks to ensure RoomAudioRenderer can play them
  // This ensures audio tracks are subscribed even though we don't render them visually
  useTracks([Track.Source.Microphone], {
    onlySubscribed: false,
  });

  // Process all video tracks to ensure they're valid and not muted
  const allTracks = useMemo(() => {
    const localIdentity = localParticipant?.identity;
    const validTracks: TrackReference[] = [];

    allVideoTracks.forEach((trackRef) => {
      // Skip if track is muted or doesn't have a track
      if (trackRef.publication.isMuted || !trackRef.publication.track) {
        return;
      }

      // Ensure it's a camera track
      if (
        trackRef.publication.kind === 'video' &&
        trackRef.publication.source === Track.Source.Camera
      ) {
        validTracks.push(trackRef);
      }
    });

    // Sort: local participant first, then remote participants
    const sortedTracks = validTracks.sort((a, b) => {
      const aIsLocal = a.participant.identity === localIdentity;
      const bIsLocal = b.participant.identity === localIdentity;
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;
      return 0;
    });

    return sortedTracks;
  }, [allVideoTracks, localParticipant?.identity]);

  // Calculate grid layout based on number of participants
  const gridCols = useMemo(() => {
    const count = allTracks.length;
    if (count === 0) return 'grid-cols-1';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3 || count === 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  }, [allTracks.length]);

  if (allTracks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-lg font-medium">कैमरा चालू करें</p>
          <p className="mt-2 text-sm">वीडियो दिखाने के लिए अपना कैमरा चालू करें</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} h-full w-full gap-2 p-2 sm:gap-4 sm:p-4`}>
      {allTracks.map((trackRef) => {
        const isLocal = trackRef.participant.identity === localParticipant?.identity;
        const participantName = trackRef.participant.name || trackRef.participant.identity;

        return (
          <div
            key={`${trackRef.participant.identity}-${trackRef.source}`}
            className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black/40 shadow-lg"
          >
            <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
            {/* Participant name overlay */}
            <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-xs font-medium text-white sm:text-sm">
                {participantName}
                {isLocal && <span className="ml-1 text-white/70">(आप)</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
