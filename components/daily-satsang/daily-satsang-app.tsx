'use client';

import { useEffect, useMemo, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { TileLayout } from '@/components/app/tile-layout';
import { Toaster } from '@/components/livekit/toaster';
import { ParticipantList } from '@/components/livesatsang/participant-list';
import { YouTubeBhajanPlayer } from '@/components/youtube/youtube-bhajan-player';
import { DailySatsangOrchestrator } from './orchestrator';

export function DailySatsangApp() {
  const [room, setRoom] = useState<Room | null>(null);
  const [participantName, setParticipantName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const defaultDurations = useMemo(
    () => ({ intro: 120, bhajan: 300, pravachan: 900, qa: 420, closing: 60 }),
    []
  );

  const handleJoin = async (name: string, role: 'host' | 'participant') => {
    try {
      const response = await fetch('/api/daily-satsang/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: name, role }),
      });
      if (!response.ok) throw new Error('Failed to get access token');
      const { serverUrl, roomName, participantToken } = await response.json();

      if (roomName !== 'DailySatsang') {
        console.error(`Warning: Room name mismatch. Expected 'DailySatsang', got '${roomName}'`);
      }

      const newRoom = new Room();
      newRoom.on(RoomEvent.Connected, () => setIsConnected(true));
      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setRoom(null);
      });

      await newRoom.connect(serverUrl, participantToken);
      setRoom(newRoom);
      setParticipantName(name);
      setIsHost(role === 'host');
    } catch (error) {
      console.error('Error joining DailySatsang:', error);
      alert('Failed to join Daily Satsang. Please try again.');
    }
  };

  const handleLeave = async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setIsHost(false);
      setStarted(false);
      setElapsedSec(0);
    }
  };

  // Elapsed LIVE timer once session is started
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [started]);

  const fmt = (n: number) => String(n).padStart(2, '0');
  const elapsedLabel = `${fmt(Math.floor(elapsedSec / 60))}:${fmt(elapsedSec % 60)}`;

  return (
    <div className="bg-background fixed inset-0 h-screen w-screen overflow-hidden">
      {!isConnected ? (
        <DailySatsangOrchestrator.Join onJoin={handleJoin} />
      ) : room ? (
        <RoomContext.Provider value={room}>
          <div className="bg-background flex h-full flex-col overflow-hidden">
            {started && <TileLayout chatOpen={false} />}
            {/* Top header */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between p-3 sm:p-4">
              <div className="border-border bg-card/90 text-card-foreground pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-md">
                <span>डेली सत्संग</span>
                {started && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-600">
                    LIVE · {elapsedLabel}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowParticipants((v) => !v)}
                className="border-border bg-card/90 text-card-foreground hover:bg-card pointer-events-auto rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-md transition-colors active:scale-95"
                aria-label="Toggle participants"
              >
                👥 प्रतिभागी
              </button>
            </div>

            {/* Participant List */}
            <ParticipantList
              room={room}
              isOpen={showParticipants}
              onClose={() => setShowParticipants(false)}
            />

            {/* Main Content Area - Session Info */}
            <div className="relative flex-1 overflow-y-auto pt-14 pb-[200px]">
              <div className="mx-auto max-w-4xl px-4 py-6">
                {/* Welcome Section */}
                {!started && (
                  <div className="mb-6 text-center">
                    <div className="mb-4 text-6xl">🕉️</div>
                    <h2 className="text-foreground text-2xl font-bold sm:text-3xl">डेली सत्संग</h2>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                      आध्यात्मिक सत्र में आपका स्वागत है
                    </p>
                  </div>
                )}

                {/* Session Info Cards */}
                {!started && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Participant Count */}
                    <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
                      <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                        प्रतिभागी
                      </div>
                      <div className="text-foreground text-2xl font-bold">
                        {room?.numParticipants ?? 1}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">सक्रिय सदस्य</div>
                    </div>

                    {/* Session Duration */}
                    <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
                      <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                        सत्र अवधि
                      </div>
                      <div className="text-foreground text-2xl font-bold">30 मिनट</div>
                      <div className="text-muted-foreground mt-1 text-xs">अनुमानित समय</div>
                    </div>

                    {/* Your Role */}
                    <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
                      <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                        आपकी भूमिका
                      </div>
                      <div className="text-foreground text-xl font-bold">
                        {isHost ? '👑 होस्ट' : '🙏 प्रतिभागी'}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {isHost ? 'आप सत्र नियंत्रित कर सकते हैं' : 'सत्र में भाग ले रहे हैं'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Guidelines */}
                {!started && (
                  <div className="bg-card border-border mt-6 rounded-xl border p-5 shadow-sm">
                    <h3 className="text-foreground mb-3 text-lg font-bold">सत्र के नियम</h3>
                    <ul className="text-muted-foreground space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>कृपया माइक्रोफ़ोन बंद रखें जब आप बोल नहीं रहे हों</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>प्रश्नोत्तर के दौरान ही प्रश्न पूछें</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>भजन और प्रवचन के दौरान शांति बनाए रखें</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>सम्मानपूर्वक व्यवहार करें</span>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Phase Information */}
                {!started && (
                  <div className="bg-card border-border mt-6 rounded-xl border p-5 shadow-sm">
                    <h3 className="text-foreground mb-3 text-lg font-bold">आज का कार्यक्रम</h3>
                    <div className="space-y-3">
                      <div className="bg-background/50 flex items-center justify-between rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                            1
                          </div>
                          <div>
                            <div className="text-foreground font-semibold">परिचय</div>
                            <div className="text-muted-foreground text-xs">2 मिनट</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-background/50 flex items-center justify-between rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                            2
                          </div>
                          <div>
                            <div className="text-foreground font-semibold">भजन</div>
                            <div className="text-muted-foreground text-xs">5 मिनट</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-background/50 flex items-center justify-between rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                            3
                          </div>
                          <div>
                            <div className="text-foreground font-semibold">प्रवचन</div>
                            <div className="text-muted-foreground text-xs">15 मिनट</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-background/50 flex items-center justify-between rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                            4
                          </div>
                          <div>
                            <div className="text-foreground font-semibold">प्रश्नोत्तर</div>
                            <div className="text-muted-foreground text-xs">7 मिनट</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-background/50 flex items-center justify-between rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                            5
                          </div>
                          <div>
                            <div className="text-foreground font-semibold">समापन भजन</div>
                            <div className="text-muted-foreground text-xs">1 मिनट</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Bottom Section - YouTube Player + Orchestrator Controls */}
            <div className="border-border bg-background fixed right-0 bottom-0 left-0 z-50 border-t shadow-2xl">
              {/* YouTube Bhajan Player - Fixed above controls */}
              <div className="px-3 pt-3">
                <YouTubeBhajanPlayer />
              </div>

              {/* Orchestrator Controls */}
              <DailySatsangOrchestrator.View
                isHost={isHost}
                participantName={participantName}
                durations={defaultDurations}
                onLeave={handleLeave}
                room={room}
                onStart={() => setStarted(true)}
              />
            </div>

            <StartAudio label="ऑडियो शुरू करें" />
            <RoomAudioRenderer />
          </div>
          <Toaster />
        </RoomContext.Provider>
      ) : null}
    </div>
  );
}
