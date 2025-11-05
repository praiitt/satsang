'use client';

import { useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { Toaster } from '@/components/livekit/toaster';
import { LiveSatsangControls } from './livesatsang-controls';
import { LiveSatsangJoinForm } from './livesatsang-join-form';
import { ParticipantList } from './participant-list';
import { ParticipantVideoGrid } from './participant-video-grid';

export function LiveSatsangApp() {
  const [room, setRoom] = useState<Room | null>(null);
  const [participantName, setParticipantName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const handleJoin = async (name: string, role: 'host' | 'participant') => {
    try {
      // Fetch token from our API
      const response = await fetch('/api/livesatsang/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantName: name,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const { serverUrl, roomName, participantToken } = await response.json();

      // Verify room name is correct
      if (roomName !== 'LiveSatsang') {
        console.error(`Warning: Room name mismatch. Expected 'LiveSatsang', got '${roomName}'`);
      }

      // Create and connect to room
      const newRoom = new Room();

      newRoom.on(RoomEvent.Connected, () => {
        console.log(`✅ Connected to LiveSatsang room: ${newRoom.name}`);
        const remoteParticipants = newRoom.remoteParticipants
          ? Array.from(newRoom.remoteParticipants.values())
          : [];
        console.log(
          `📊 Current participants:`,
          remoteParticipants.map((p) => p.identity)
        );
        setIsConnected(true);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('❌ Disconnected from LiveSatsang room');
        setIsConnected(false);
        setRoom(null);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log(`👤 Participant joined: ${participant.identity} (${participant.name})`);
        console.log(`📊 Total participants now: ${newRoom.numParticipants ?? 0}`);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log(`👋 Participant left: ${participant.identity} (${participant.name})`);
        console.log(`📊 Total participants now: ${newRoom.numParticipants ?? 0}`);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log(
          `🎥 Track subscribed: ${track.kind} from ${participant.identity} (${participant.name})`
        );
      });

      // Connect to the room - LiveKit extracts room name from token
      console.log(`🔌 Connecting to room with token...`);
      await newRoom.connect(serverUrl, participantToken);

      // Verify we're in the correct room
      if (newRoom.name !== 'LiveSatsang') {
        console.error(
          `❌ ERROR: Connected to wrong room! Expected 'LiveSatsang', got '${newRoom.name}'`
        );
        alert(`Error: Connected to wrong room (${newRoom.name}). Please try again.`);
        await newRoom.disconnect();
        return;
      }

      console.log(`✅ Successfully connected to room: ${newRoom.name}`);
      if (newRoom.remoteParticipants) {
        const remoteParticipants = Array.from(newRoom.remoteParticipants.values());
        console.log(
          `📊 Initial participants:`,
          remoteParticipants.map((p) => ({
            identity: p.identity,
            name: p.name,
            isLocal: false,
          }))
        );
        console.log(`📊 Local participant: ${newRoom.localParticipant.identity}`);
      } else {
        console.log(`📊 Initial participants: (participants not available yet)`);
      }

      setRoom(newRoom);
      setParticipantName(name);
      setIsHost(role === 'host');
    } catch (error) {
      console.error('Error joining LiveSatsang:', error);
      alert('Failed to join LiveSatsang. Please try again.');
    }
  };

  const handleLeave = async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setIsHost(false);
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-slate-900">
      {!isConnected ? (
        <LiveSatsangJoinForm onJoin={handleJoin} />
      ) : room ? (
        <RoomContext.Provider value={room}>
          <div className="flex h-full flex-col overflow-hidden bg-slate-900">
            {/* Top header */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between p-3 sm:p-4">
              <div className="pointer-events-auto rounded-full border border-white/20 bg-slate-800/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md">
                लाइव सत्संग
              </div>
              <button
                onClick={() => setShowParticipants((v) => !v)}
                className="pointer-events-auto rounded-full border border-white/20 bg-slate-800/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md hover:bg-slate-700/90 active:scale-95"
                aria-label="Toggle participants"
              >
                👥 प्रतिभागी
              </button>
            </div>

            {/* Participant List - panel / sheet */}
            <ParticipantList
              room={room}
              isOpen={showParticipants}
              onClose={() => setShowParticipants(false)}
            />

            {/* Video Conference Grid - Add padding to prevent overlap with fixed controls */}
            <div className="relative flex-1 overflow-hidden pt-14 pb-72 sm:pt-16 sm:pb-64 md:pb-60">
              <ParticipantVideoGrid />
            </div>

            {/* Controls Bar - Fixed at bottom */}
            <LiveSatsangControls
              room={room}
              participantName={participantName}
              isHost={isHost}
              onLeave={handleLeave}
            />

            <StartAudio label="ऑडियो शुरू करें" />
            <RoomAudioRenderer />
          </div>
          <Toaster />
        </RoomContext.Provider>
      ) : null}
    </div>
  );
}
