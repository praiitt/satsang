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
    introBhajanVideoId?: string;
    closingBhajanVideoId?: string;
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

    // Helper to extract YouTube ID
    const extractYouTubeVideoId = useCallback((input: string | undefined): string | null => {
        if (!input) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
        const match = input.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
        );
        return match ? match[1] : null;
    }, []);

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
                case 'bhajan':
                    // Instruct to find popular/community appreciated music
                    const videoId = config.introBhajanVideoId || '';
                    if (!videoId) {
                        console.warn('[SatsangLogic] No specific bhajan video ID found in config');
                    } else {
                        console.log('[SatsangLogic] Using specific bhajan video ID:', videoId);
                    }

                    const specificInstruction = videoId
                        ? `3. CRITICAL: Use tool 'play_bhajan' with video_id="${videoId}"`
                        : `3. Use tool 'play_bhajan' to play a popular bhajan related to "${topic}"`;

                    prompt = `STARTING PHASE: BHAJAN
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Announce: "अब हम भजन सुनेंगे" (Now we will listen to a bhajan).
                    2. You MUST play music now.
                    ${specificInstruction}
                    4. Remain silent while the music plays.`;
                    break;
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
                case 'closing':
                    const closingVideoId = config.closingBhajanVideoId || '';
                    const closingInstruction = closingVideoId
                        ? `3. Use tool 'play_bhajan' with video_id="${closingVideoId}" for the closing Aarti/Bhajan`
                        : `3. Use tool 'play_bhajan' to play a closing Aarti or peaceful chant`;

                    prompt = `STARTING PHASE: CLOSING
                    Topic: "${topic}"
                    
                    Instructions for Agent:
                    1. Bring the session to a gentle close.
                    2. Offer final blessings.
                    ${closingInstruction}
                    4. Bid farewell.`;
                    break;
            }

            if (prompt) {
                // Ensure we catch any errors if send fails due to connection
                try {
                    await send(prompt);
                    console.log(`[SatsangLogic] Sent prompt for ${phase}`);
                } catch (e) {
                    console.warn(`[SatsangLogic] Failed to send prompt for ${phase}`, e);
                }
            }

            if (phase !== 'bhajan' && phase !== 'closing') {
                publishToAgent({ type: 'bhajan', action: 'pause' });
            }
        },
        [config.topic, config.introBhajanVideoId, config.closingBhajanVideoId, durations, publishToAgent, send]
    );

    // Phase transition effect
    useEffect(() => {
        setRemaining(getDuration(currentPhase.key));
        if (lastPhaseRef.current !== currentPhase.key) {
            sendPhaseMessage(currentPhase.key, config.topic);
            void sendPromptForPhase(currentPhase.key);
            onPhaseChange?.(currentPhase.key);
            lastPhaseRef.current = currentPhase.key;
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
        if (remaining === 0 && isRunning) {
            if (currentIndex < phases.length - 1) {
                setCurrentIndex(prev => prev + 1);
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
