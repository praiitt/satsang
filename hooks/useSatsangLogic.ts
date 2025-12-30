import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
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
        (payload: Record<string, unknown>) => {
            if (!room) return;
            try {
                const data = new TextEncoder().encode(JSON.stringify(payload));
                room.localParticipant.publishData(data, {
                    reliable: true,
                    topic: 'daily_satsang',
                });
                console.log('[SatsangLogic] → agent', payload);
            } catch (e) {
                console.error('[SatsangLogic] publish error', e);
            }
        },
        [room]
    );

    // Send phase message
    const sendPhaseMessage = useCallback(
        (phase: PhaseName, topic?: string) => {
            if (!room) return;
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
                room.localParticipant.publishData(data, {
                    reliable: true,
                    topic: 'daily_satsang',
                });
            } catch (error) {
                console.error('Failed to send phase message:', error);
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

            switch (phase) {
                case 'intro':
                    // Explicit instruction to start with the chosen topic and give a "Parichay"
                    prompt = `परिचय चरण (Introduction Phase).
                    विषय: "${topic}"
                    
                    निर्देश:
                    1. सबसे पहले स्पष्ट रूप से बताएं कि आज का विषय "${topic}" है।
                    2. इस विषय पर एक संक्षिप्त परिचय (Parichay) दें।
                    3. श्रोताओं का स्वागत करें।
                    
                    यह चरण छोटा रखें (लगभग 2 मिनट)।`;
                    break;
                case 'bhajan':
                    // Instruct to find popular/community appreciated music
                    prompt = `भजन चरण (Bhajan Phase).
                    विषय: "${topic}"
                    
                    निर्देश:
                    1. अब कहें "अब हम भजन सुनेंगे"।
                    2. विषय से संबंधित एक "सुप्रसिद्ध (popular community favorite)" भजन 'play_bhajan' टूल का उपयोग करके चलाएं।
                    3. भजन चलने के दौरान शांत रहें।`;
                    break;
                case 'pravachan':
                    // Enforce duration more strictly
                    const durationMins = mins(durations.pravachan);
                    prompt = `प्रवचन चरण (Discourse Phase).
                    विषय: "${topic}"
                    
                    निर्देश:
                    1. अब मुख्य प्रवचन शुरू करें।
                    2. आपको कम से कम ${durationMins} मिनट तक लगातार बोलना है।
                    3. विषय को गहराई से समझाएं, उदाहरण और कहानियां (stories) दें।
                    4. बीच में रुकें नहीं, यह एक विस्तृत प्रवचन होना चाहिए।`;
                    break;
                case 'qa':
                    prompt = `प्रश्नोत्तर चरण (Q&A Phase).
                    विषय: "${topic}"
                    
                    निर्देश:
                    1. अब श्रोताओं से प्रश्न पूछने के लिए कहें।
                    2. उनके सवालों के जवाब दें।`;
                    break;
                case 'closing':
                    prompt = `समापन चरण (Closing Phase).
                    
                    निर्देश:
                    1. सत्र का समापन करें।
                    2. 'play_bhajan' टूल से एक आरती या समापन भजन चलाएं।
                    3. अंतिम आशीर्वाद दें।`;
                    break;
            }

            if (prompt) {
                await send(prompt);
            }

            if (phase !== 'bhajan' && phase !== 'closing') {
                publishToAgent({ type: 'bhajan', action: 'pause' });
            }
        },
        [config.topic, durations, publishToAgent, send]
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
