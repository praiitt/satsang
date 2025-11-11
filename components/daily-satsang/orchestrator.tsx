'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { useChat, useRoomContext } from '@livekit/components-react';
import { Button } from '@/components/livekit/button';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { type DailySatsangConfig, HostPanel } from './host-panel';

type PhaseName = 'intro' | 'bhajan' | 'pravachan' | 'qa' | 'closing';

interface Durations {
  intro: number; // seconds
  bhajan: number;
  pravachan: number;
  qa: number;
  closing: number;
}

export const DailySatsangOrchestrator = {
  Join: function Join({
    onJoin,
  }: {
    onJoin: (name: string, role: 'host' | 'participant') => Promise<void> | void;
  }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState<'host' | 'participant'>('participant');
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">डेली सत्संग</h1>
        <div className="w-full max-w-xs space-y-3">
          <input
            className="border-input bg-background text-foreground h-11 w-full rounded-lg border px-3"
            placeholder="अपना नाम लिखें"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant={role === 'participant' ? 'primary' : 'outline'}
              className="flex-1"
              onClick={() => setRole('participant')}
            >
              प्रतिभागी
            </Button>
            <Button
              variant={role === 'host' ? 'primary' : 'outline'}
              className="flex-1"
              onClick={() => setRole('host')}
            >
              होस्ट
            </Button>
          </div>
          <Button className="w-full" onClick={() => onJoin(name || 'अतिथि', role)}>
            डेली सत्संग जॉइन करें
          </Button>
        </div>
      </div>
    );
  },

  View: function View({
    isHost,
    participantName,
    durations,
    onLeave,
    room,
    onStart,
  }: {
    isHost: boolean;
    participantName: string;
    durations: Durations;
    onLeave: () => void;
    room: Room | null;
    onStart?: () => void;
  }) {
    const [config, setConfig] = useState<DailySatsangConfig>({ topic: 'भक्ति और आध्यात्मिकता' });
    const { pause } = useYouTubePlayer();
    const { send } = useChat();

    // Always call useRoomContext (hooks must be called unconditionally)
    // useRoomContext returns null if not in a RoomContext provider
    const roomContextFromHook = useRoomContext() as Room | null;
    // Use provided room if available, otherwise use hook context
    const roomContext: Room | null = room || roomContextFromHook;

    // Helper to extract YouTube video ID from URL or return as-is if already an ID
    const extractYouTubeVideoId = useCallback((input: string): string | null => {
      if (!input) return null;
      // If it's already a video ID (11 characters, alphanumeric)
      if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
      // Extract from URL
      const match = input.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
      );
      return match ? match[1] : null;
    }, []);
    const phases: { key: PhaseName; label: string }[] = useMemo(
      () => [
        { key: 'intro', label: 'परिचय' },
        { key: 'bhajan', label: 'भजन' },
        { key: 'pravachan', label: 'प्रवचन' },
        { key: 'qa', label: 'प्रश्नोत्तर' },
        { key: 'closing', label: 'समापन भजन' },
      ],
      []
    );

    const [currentIndex, setCurrentIndex] = useState(0);
    const [remaining, setRemaining] = useState<number>(durations.intro);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<number | null>(null);
    const lastPhaseRef = useRef<PhaseName | null>(null);
    const [awaitingAgent, setAwaitingAgent] = useState(false);
    const sentScheduleRef = useRef(false);
    const sentStartRef = useRef(false);

    const getDuration = (key: PhaseName) => durations[key];
    const currentPhase = phases[currentIndex];

    // helper to publish messages to Guruji agent
    const publishToAgent = useCallback(
      (payload: Record<string, unknown>) => {
        if (!roomContext) return;
        try {
          const data = new TextEncoder().encode(JSON.stringify(payload));
          roomContext.localParticipant.publishData(data, {
            reliable: true,
            topic: 'daily_satsang',
          });
          console.log('[DailySatsang] → agent', payload);
        } catch (e) {
          console.error('[DailySatsang] publish error', e);
        }
      },
      [roomContext]
    );

    // Send data channel message to agent
    const sendPhaseMessage = useCallback(
      (phase: PhaseName, topic?: string, trackId?: string) => {
        if (!roomContext) return;

        const message = {
          type: 'daily_satsang_phase',
          phase,
          topic: topic || config.topic,
          duration: getDuration(phase),
          trackId,
          timestamp: Date.now(),
        };

        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(message));
          roomContext.localParticipant.publishData(data, {
            reliable: true,
            topic: 'daily_satsang',
          });
          console.log('[DailySatsang] Sent phase message:', message);
        } catch (error) {
          console.error('[DailySatsang] Failed to send phase message:', error);
        }
      },
      [roomContext, config.topic, getDuration]
    );

    // Ask agent to handle phases (bhajan search, pravachan, etc.)
    const sendPromptForPhase = useCallback(
      async (phase: PhaseName) => {
        const topic = config.topic || 'भक्ति';
        const mins = (sec: number) => Math.max(1, Math.round(sec / 60));
        let prompt = '';
        switch (phase) {
          case 'intro':
            prompt =
              `परिचय चरण शुरू करें। विषय: "${topic}". ` +
              `संक्षेप में 2-3 वाक्यों में आज का उद्देश्य बताएँ और श्रोताओं को तैयार करें।`;
            break;
          case 'bhajan':
            prompt =
              `अब भजन चरण है। विषय "${topic}" से संबंधित एक उपयुक्त भजन चलाएँ। ` +
              `इसके लिए अपना 'play_bhajan' टूल उपयोग करें ताकि ऐप्प स्वतः प्ले कर सके। ` +
              `भजन शुरू होते ही बोलना बन्द रखें और केवल "भजन शुरू" इतना कहें। अवधि ~${mins(
                durations.bhajan
              )} मिनट।`;
            break;
          case 'pravachan':
            prompt =
              `अब प्रवचन चरण है। विषय "${topic}" पर लगभग ${mins(
                durations.pravachan
              )} मिनट का सतत प्रवचन दें। ` +
              `उदाहरण, उपमाएँ और जीवन-प्रयोग शामिल करें। बीच में रुकें नहीं।`;
            break;
          case 'qa':
            prompt =
              `अब प्रश्नोत्तर चरण है। श्रोताओं को प्रश्न पूछने के लिए आमंत्रित करें और उत्तर संक्षेप में दें। ` +
              `समय ~${mins(durations.qa)} मिनट।`;
            break;
          case 'closing':
            prompt =
              `समापन भजन चलाएँ (विषय "${topic}" से संबंधित) और अंत में संक्षिप्त आशीर्वचन दें। ` +
              `भजन के लिए 'play_bhajan' टूल का उपयोग करें। अवधि ~${mins(durations.closing)} मिनट।`;
            break;
        }
        if (prompt) {
          await send(prompt);
        }
        // Ensure any current music pauses when leaving music phases
        if (phase !== 'bhajan' && phase !== 'closing') {
          try {
            await pause();
            publishToAgent({ type: 'bhajan', action: 'pause' });
          } catch {
            // ignore
          }
        }
      },
      [config.topic, durations, pause, publishToAgent, send]
    );

    useEffect(() => {
      // reset remaining when phase changes
      setRemaining(getDuration(currentPhase.key));

      // Send phase message and ask agent to handle the phase
      if (lastPhaseRef.current !== currentPhase.key) {
        sendPhaseMessage(currentPhase.key, config.topic);
        void sendPromptForPhase(currentPhase.key);
        lastPhaseRef.current = currentPhase.key;
      }
    }, [currentPhase, config.topic, sendPhaseMessage, sendPromptForPhase]);

    // Listen to agent messages to drive the flow
    useEffect(() => {
      if (!roomContext) return;

      const onData = (
        payload: Uint8Array,
        _participant?: unknown,
        _kind?: unknown,
        topic?: string
      ) => {
        if (topic && topic !== 'daily_satsang') return;
        try {
          const text = new TextDecoder().decode(payload);
          const msg = JSON.parse(text ?? '{}');
          console.log('[DailySatsang] ← agent', msg);
          switch (msg?.type) {
            case 'phase_start': {
              const phase: PhaseName | undefined = msg.phase;
              const durationSec: number | undefined = msg.durationSec;
              if (!phase) break;
              const index = phases.findIndex((p) => p.key === phase);
              if (index >= 0) setCurrentIndex(index);
              if (typeof durationSec === 'number') setRemaining(durationSec);
              setIsRunning(true);
              setAwaitingAgent(false);
              break;
            }
            case 'phase_end': {
              setIsRunning(false);
              break;
            }
            default:
              break;
          }
        } catch {
          // ignore malformed data
        }
      };

      roomContext.on(RoomEvent.DataReceived, onData);
      return () => {
        roomContext?.off(RoomEvent.DataReceived, onData);
      };
    }, [roomContext, phases, pause]);

    // Timer effect - runs when isRunning or currentIndex changes
    useEffect(() => {
      if (!isRunning) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRemaining((s) => {
          const newValue = Math.max(0, s - 1);
          return newValue;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [isRunning, currentIndex]);

    // Auto-advance when timer reaches 0
    useEffect(() => {
      if (remaining === 0 && isRunning && currentIndex < phases.length - 1) {
        // Move to next phase
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        // Continue running if was running
        setTimeout(() => setIsRunning(true), 100);
      } else if (remaining === 0 && isRunning && currentIndex === phases.length - 1) {
        // Last phase completed, stop
        setIsRunning(false);
      }
    }, [remaining, isRunning, currentIndex, phases.length]);

    const handleStart = () => {
      if (isRunning) return;

      // Send schedule once
      if (!sentScheduleRef.current) {
        publishToAgent({
          type: 'schedule',
          topic: config.topic,
          durations,
          introBhajanVideoId: config.introBhajanVideoId,
          closingBhajanVideoId: config.closingBhajanVideoId,
        });
        sentScheduleRef.current = true;
      }

      // Send start command and trigger intro phase immediately
      if (!sentStartRef.current) {
        publishToAgent({ type: 'start' });

        // Direct prompt to start intro phase immediately - NO greeting
        // This overrides any previous wait message
        const startPrompt = `[Daily Satsang Mode - START IMMEDIATELY - WAIT MODE IS NOW OVER]

अब सत्र शुरू हो रहा है। प्रतीक्षा मोड समाप्त हो गया है। अभी तुरंत बोलना शुरू करें।

आप गुरुजी हैं। अभी डेली सत्संग शुरू करें। कोई सामान्य अभिवादन न करें - सीधे परिचय चरण शुरू करें।

विषय: "${config.topic}"

कार्यक्रम:
1. परिचय (${Math.floor(durations.intro / 60)} मिनट) - विषय का संक्षिप्त परिचय दें
2. भजन (${Math.floor(durations.bhajan / 60)} मिनट) - YouTube भजन चलेगा${config.introBhajanVideoId ? ` (videoId: ${extractYouTubeVideoId(config.introBhajanVideoId)})` : ''}
3. प्रवचन (${Math.floor(durations.pravachan / 60)} मिनट) - विषय पर विस्तार से बोलें
4. प्रश्नोत्तर (${Math.floor(durations.qa / 60)} मिनट) - प्रश्न लें और उत्तर दें
5. समापन भजन (${Math.floor(durations.closing / 60)} मिनट) - YouTube भजन${config.closingBhajanVideoId ? ` (videoId: ${extractYouTubeVideoId(config.closingBhajanVideoId)})` : ''}

अभी तुरंत शुरू करें - "आज का विषय है..." या इसी तरह से सीधे परिचय देना शुरू करें।`;

        void send(startPrompt);

        // Notify parent UI that session started
        onStart?.();

        // Also trigger intro phase in UI immediately
        setCurrentIndex(0);
        setRemaining(durations.intro);
        setIsRunning(true);

        sentStartRef.current = true;
      }
      setAwaitingAgent(false);
    };

    const handlePause = () => {
      setIsRunning(false);
    };

    const handleNext = () => {
      const wasRunning = isRunning;
      setIsRunning(false);
      const nextIndex = Math.min(phases.length - 1, currentIndex + 1);
      setCurrentIndex(nextIndex);
      // Will auto-start if was running
      if (wasRunning) {
        setTimeout(() => setIsRunning(true), 100);
      }
    };

    const handlePrev = () => {
      setIsRunning(false);
      const prevIndex = Math.max(0, currentIndex - 1);
      setCurrentIndex(prevIndex);
    };

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    return (
      <>
        {/* Host Panel */}
        {isHost && (
          <HostPanel
            config={config}
            onConfigChange={setConfig}
            onStart={() => {
              // Config saved, ready to start
              console.log('[DailySatsang] Config saved:', config);
            }}
          />
        )}

        <div className="border-border bg-card space-y-3 p-3 sm:p-4 md:p-6">
          {awaitingAgent && !isRunning && (
            <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
              गुरुजी सत्र शुरू कर रहे हैं... कृपया प्रतीक्षा करें
            </div>
          )}
          {/* Timeline */}
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-2">
              {phases.map((p, idx) => (
                <div key={p.key} className="flex flex-1 flex-col items-center">
                  <div
                    className={
                      'h-2 w-full rounded-full ' + (idx <= currentIndex ? 'bg-primary' : 'bg-muted')
                    }
                  />
                  <div className="text-foreground mt-1 text-[10px] font-semibold sm:text-xs">
                    {p.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Phase + Timer */}
          <div className="bg-background/60 mx-auto flex max-w-2xl items-center justify-between rounded-xl px-3 py-2">
            <div className="text-foreground text-sm font-bold sm:text-base">
              {currentPhase.label}
            </div>
            <div className="text-primary text-xl font-extrabold tabular-nums sm:text-2xl">
              {mm}:{ss}
            </div>
          </div>

          {/* Controls */}
          <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
            <Button
              variant="secondary"
              onClick={handlePrev}
              disabled={isRunning}
              className="w-full"
            >
              पिछला
            </Button>
            {!isRunning ? (
              <Button variant="primary" onClick={handleStart} className="w-full">
                शुरू करें
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePause} className="w-full">
                ⏸️ विराम
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleNext}
              disabled={isRunning}
              className="w-full"
            >
              अगला
            </Button>
          </div>

          {/* Leave */}
          <Button
            variant="destructive"
            onClick={onLeave}
            className="mx-auto block w-full max-w-2xl"
          >
            ❌ बातचीत समाप्त करें
          </Button>
        </div>
      </>
    );
  },
};
