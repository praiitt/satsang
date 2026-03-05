import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionState, Room, RoomEvent } from 'livekit-client';
import { useChat } from '@livekit/components-react';

export type PhaseName = 'intro' | 'bhajan' | 'pravachan' | 'qa' | 'closing';

export interface Durations {
    intro: number;
    bhajan: number;
    pravachan: number;
    qa: number;
    closing: number;
}

export interface SatsangConfig {
    topic: string;
    /** rraasi audio URL for bhajan phase */
    introBhajanAudioUrl?: string;
    /** rraasi audio URL for closing phase */
    closingBhajanAudioUrl?: string;
}

export function useSatsangLogic({
    room,
    durations,
    config,
    onLeave,
    onPhaseChange,
}: {
    room: Room | null;
    durations: Durations;
    config: SatsangConfig;
    onLeave?: () => void;
    onPhaseChange?: (phase: PhaseName) => void;
}) {
    const { send } = useChat();

    const phases: { key: PhaseName; label: string }[] = useMemo(
        () => [
            { key: 'intro', label: 'परिचय' },
            { key: 'bhajan', label: 'भजन' },
            { key: 'pravachan', label: 'प्रवचन' },
            { key: 'qa', label: 'प्रश्नोत्तर' },
            { key: 'closing', label: 'समापन' },
        ],
        []
    );

    const [currentIndex, setCurrentIndex] = useState(0);
    const [remaining, setRemaining] = useState<number>(durations.intro);
    const [isRunning, setIsRunning] = useState(false);

    // Auto-start effect
    useEffect(() => {
        if (!room) return;
        // Small delay to ensure connection is stable and agent is ready
        const t = setTimeout(() => {
            if (!isRunning) handleStart();
        }, 1000);
        return () => clearTimeout(t);
    }, [room]); // Run once when room is available
    const timerRef = useRef<number | null>(null);
    const lastPhaseRef = useRef<PhaseName | null>(null);
    const sentScheduleRef = useRef(false);
    const sentStartRef = useRef(false);

    const getDuration = (key: PhaseName) => durations[key];
    const currentPhase = phases[currentIndex];

    // (YouTube helper removed — now using rraasi audio directly)

    // Helper to publish messages to agent
    const publishToAgent = useCallback(
        async (payload: Record<string, unknown>) => {
            if (!room || room.state !== 'connected') {
                console.warn('[SatsangLogic] Room not connected, skipping publish', payload.type);
                return;
            }
            try {
                const data = new TextEncoder().encode(JSON.stringify(payload));
                await room.localParticipant.publishData(data, {
                    reliable: true,
                    topic: 'daily_satsang',
                });
                console.log('[SatsangLogic] → agent', payload);
            } catch (e: any) {
                // Swallow connection errors to prevent app crash
                if (e?.message?.includes('closed') || e?.name === 'UnexpectedConnectionState') {
                    console.warn('[SatsangLogic] Connection closed while publishing:', e);
                } else {
                    console.error('[SatsangLogic] publish error', e);
                }
            }
        },
        [room]
    );

    // Send phase message
    const sendPhaseMessage = useCallback(
        async (phase: PhaseName, topic?: string) => {
            if (!room || room.state !== ConnectionState.Connected) return;
            const message = {
                type: 'daily_satsang_phase',
                phase,
                topic: topic || config.topic,
                duration: getDuration(phase),
                timestamp: Date.now(),
            };

            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(JSON.stringify(message));
                await room.localParticipant.publishData(data, {
                    reliable: true,
                    topic: 'daily_satsang',
                });
            } catch (error: any) {
                if (error?.message?.includes('closed') || error?.name === 'UnexpectedConnectionState') {
                    console.warn('Connection closed while sending phase message');
                } else {
                    console.error('Failed to send phase message:', error);
                }
            }
        },
        [room, config.topic, getDuration]
    );

    // Prompt agent for each phase
    const sendPromptForPhase = useCallback(
        async (phase: PhaseName) => {
            const topic = config.topic || 'भक्ति';
            const mins = (sec: number) => Math.max(1, Math.round(sec / 60));
            let prompt = '';

            if (!room || room.state !== ConnectionState.Connected) {
                console.warn('[SatsangLogic] Room not connected, skipping prompt for', phase);
                return;
            }

            switch (phase) {
                case 'intro':
                    // Explicit instruction to start with the chosen topic and give a "Parichay"
                    prompt = `STARTING PHASE: INTRO
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Direct your attention to the topic "${topic}".
                    2. Provide a warm and insightful introduction (Parichay) to this topic in Hindi.
                    3. Welcome the seekers.
                    4. Keep this brief (approx 2 mins).`;
                    break;
                case 'bhajan': {
                    const hasBhajan = !!config.introBhajanAudioUrl;
                    console.log('[SatsangLogic] Bhajan phase — rraasi audio available:', hasBhajan);

                    prompt = `STARTING PHASE: BHAJAN
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Announce gently: "अब हम भजन सुनेंगे" (Now we will listen to a bhajan).
                    2. The music is playing automatically in the app. You do NOT need to use any tool.
                    3. Remain completely silent while the music plays. Do not speak.
                    4. When the music ends, the next phase will begin automatically.`;
                    break;
                }
                case 'pravachan':
                    // Enforce duration more strictly
                    const durationMins = mins(durations.pravachan);
                    prompt = `STARTING PHASE: PRAVACHAN (Discourse)
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Begin the main discourse now.
                    2. You must speak for at least ${durationMins} minutes.
                    3. Deeply explore the topic with stories, metaphors, and scripture.
                    4. Do not stop early. This is the main teaching.`;
                    break;
                case 'qa':
                    prompt = `STARTING PHASE: Q&A
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Invite the seekers to ask questions about the discourse.
                    2. Answer their questions with wisdom and patience.`;
                    break;
                case 'closing': {
                    prompt = `STARTING PHASE: CLOSING
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Bring the session to a gentle close with warmth and grace.
                    2. Offer final blessings (Ashirwad) to the seeker.
                    3. Closing music is playing automatically in the app. You do NOT need to use any tool.
                    4. Remain silent while the closing music plays, then bid a peaceful farewell.`;
                    break;
                }
            }

            if (prompt) {
                // Ensure we catch any errors if send fails due to connection
                try {
                    // Add identifier so agent knows this is a phase instruction to speak immediately
                    await send(`[PHASE_PROMPT] ${prompt}`);
                    console.log(`[SatsangLogic] Sent prompt for ${phase}`);
                } catch (e) {
                    console.warn(`[SatsangLogic] Failed to send prompt for ${phase}`, e);
                }
            }

            if (phase !== 'bhajan' && phase !== 'closing') {
                publishToAgent({ type: 'bhajan', action: 'pause' });
            }
        },
        [config.topic, config.introBhajanAudioUrl, config.closingBhajanAudioUrl, durations, publishToAgent, send]
    );

    // Phase transition effect
    useEffect(() => {
        setRemaining(getDuration(currentPhase.key));
        if (lastPhaseRef.current !== currentPhase.key) {
            sendPhaseMessage(currentPhase.key, config.topic);
            void sendPromptForPhase(currentPhase.key);
            onPhaseChange?.(currentPhase.key);
            lastPhaseRef.current = currentPhase.key;

            // For bhajan and closing phases, the agent remains silent and won't send phase_start.
            // We must start the timer manually to ensure auto-advance works.
            if (currentPhase.key === 'bhajan' || currentPhase.key === 'closing') {
                setTimeout(() => setIsRunning(true), 150);
            }
        }
    }, [currentPhase, config.topic, sendPhaseMessage, sendPromptForPhase, onPhaseChange]);

    // Listen for agent control messages
    useEffect(() => {
        if (!room) return;
        const onData = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
            if (topic && topic !== 'daily_satsang') return;
            try {
                const text = new TextDecoder().decode(payload);
                const msg = JSON.parse(text ?? '{}');
                if (msg?.type === 'phase_start') {
                    setIsRunning(true);
                } else if (msg?.type === 'phase_end') {
                    setIsRunning(false);
                }
            } catch { }
        };
        room.on(RoomEvent.DataReceived, onData);
        return () => { room.off(RoomEvent.DataReceived, onData); };
    }, [room]);


    // Timer Logic
    useEffect(() => {
        if (!isRunning) {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }
        timerRef.current = window.setInterval(() => {
            setRemaining((s) => Math.max(0, s - 1));
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, currentIndex]);

    // Auto-advance
    useEffect(() => {
        if (remaining <= 0 && isRunning) {
            setIsRunning(false);
            if (currentIndex < phases.length - 1) {
                const nextIndex = currentIndex + 1;
                setCurrentIndex(nextIndex);
                // Important: Wait for next tick so `remaining` has time to update to the new duration
                // before we set isRunning back to true, otherwise we infinite loop instantly skipping all phases.
                setTimeout(() => setIsRunning(true), 100);
            } else {
                setIsRunning(false); // End of session
            }
        }
    }, [remaining, isRunning, currentIndex, phases.length]);


    // Actions
    const handleStart = () => {
        if (isRunning) return;

        if (!sentStartRef.current) {
            // Send initial start commands
            const startPrompt = `[Daily Satsang Mode - START]
विषय: "${config.topic}"

महत्वपूर्ण निर्देश:
1. कोई सामान्य अभिवादन (Hello/Namaste) न करें।
2. **सीधे** विषय "${config.topic}" पर परिचय (Parichay) देना शुरू करें।
3. कहें: "आज का हमारा विषय है ${config.topic}..."
4. परिचय चरण तुरंत शुरू करें।`;

            void send(startPrompt);
            publishToAgent({ type: 'start' });

            setCurrentIndex(0);
            setRemaining(durations.intro);
            setIsRunning(true);
            sentStartRef.current = true;
        } else {
            setIsRunning(true); // Resume
        }
    };

    const handlePause = () => setIsRunning(false);

    const handleNext = () => {
        setIsRunning(false);
        const nextIndex = Math.min(phases.length - 1, currentIndex + 1);
        setCurrentIndex(nextIndex);
        setTimeout(() => setIsRunning(true), 100);
    };

    const handlePrev = () => {
        setIsRunning(false);
        const prevIndex = Math.max(0, currentIndex - 1);
        setCurrentIndex(prevIndex);
    };

    return {
        currentPhase,
        currentIndex,
        totalPhases: phases.length,
        remaining,
        isRunning,
        phases,
        handleStart,
        handlePause,
        handleNext,
        handlePrev
    };
}
