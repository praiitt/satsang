'use client';

import { useEffect, useState } from 'react';
import { Room, Track } from 'livekit-client';
import { useSatsangLogic, Durations } from '@/hooks/useSatsangLogic';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useLocalParticipant, useRemoteParticipants, useTracks } from '@livekit/components-react';
import { RraasiBhajanPlayer } from './rraasi-bhajan-player';
import { AgentAudioVisualizerAura } from '@/components/agents-ui/agent-audio-visualizer-aura';
import { useLanguage } from '@/contexts/language-context';

// Phase emoji map for visual indicator
const PHASE_EMOJI: Record<string, string> = {
    intro: '🙏',
    meditation: '🎵',
    pravachan: '📖',
    qa: '💬',
    closing: '🕊️',
};

// Phase transition overlay — shown briefly when phase changes
function PhaseTransitionOverlay({ label, emoji }: { label: string; emoji: string }) {
    return (
        <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'backOut' }}
                className="flex flex-col items-center gap-3"
            >
                <div className="text-7xl">{emoji}</div>
                <p className="text-white text-xl font-serif font-light tracking-widest uppercase">
                    {label}
                </p>
                <div className="flex gap-1 mt-1">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className="h-1 w-1 rounded-full bg-orange-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}

interface SatsangSessionViewProps {
    room: Room | null;
    guruName: string;
    guruId: string;
    durations: Durations;
    onLeave: () => void;
    initialTopic?: string;
    /** rraasi music for meditation phase */
    meditationAudioUrl?: string | null;
    meditationTitle?: string | null;
    meditationImageUrl?: string | null;
    guruImage?: string;
    onPhaseChange?: (phase: string) => void;
}

export function SatsangSessionView({
    room,
    guruName,
    guruId,
    durations,
    onLeave,
    initialTopic,
    meditationAudioUrl,
    meditationTitle,
    meditationImageUrl,
    guruImage,
    onPhaseChange,
}: SatsangSessionViewProps) {
    const [showTransition, setShowTransition] = useState(false);
    const [transitionLabel, setTransitionLabel] = useState('');
    const [transitionEmoji, setTransitionEmoji] = useState('');
    const [prevPhaseKey, setPrevPhaseKey] = useState<string | null>(null);
    const remoteParticipants = useRemoteParticipants({ room: room || undefined });
    const agentParticipant = remoteParticipants.find(p => p.isAgent || p.identity.includes('agent'));
    const agentIsSpeaking = agentParticipant?.isSpeaking ?? false;
    const [hasAgentSpokenIntro, setHasAgentSpokenIntro] = useState(false);
    const { t } = useLanguage();

    // Get agent audio track for visualizer
    const audioTracks = useTracks([Track.Source.Microphone], { 
        room: room || undefined, 
        onlySubscribed: true 
    }).filter(t => t.participant.identity === agentParticipant?.identity);
    const agentAudioTrack = audioTracks.length > 0 ? audioTracks[0] : undefined;

    const {
        currentPhase,
        remaining,
        overallSeconds,
        isRunning,
        phases,
        handleStart,
        handlePause,
        handleNext,
        handlePrev
    } = useSatsangLogic({
        room,
        durations,
        config: {
            topic: initialTopic || 'Spiritual Wisdom',
            introMeditationAudioUrl: meditationAudioUrl || undefined,
        },
        onLeave,
        onPhaseChange,
        publishToAgent: (msg) => {
            if (!room || !room.localParticipant) return;
            try {
                const payload = new TextEncoder().encode(JSON.stringify(msg));
                room.localParticipant.publishData(payload, { reliable: true, topic: 'satsang_control' });
            } catch (e) { }
        }
    });

    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant({ room: room || undefined });

    const toggleMic = async () => {
        if (localParticipant?.isMicrophoneEnabled) {
            await localParticipant.setMicrophoneEnabled(false);
        } else {
            await localParticipant?.setMicrophoneEnabled(true);
        }
    };

    // Auto-advance Intro & Pravachan when the agent finishes speaking.
    // Intro: 4s silence timeout (short, single speech)
    // Pravachan: 12s silence timeout (long enough to survive pauses between points, but responsive enough to move on)
    useEffect(() => {
        if ((currentPhase.key === 'intro' || currentPhase.key === 'pravachan') && isRunning) {
            if (agentIsSpeaking) {
                setHasAgentSpokenIntro(true);
            } else if (!agentIsSpeaking && hasAgentSpokenIntro) {
                const silenceTimeout = currentPhase.key === 'pravachan' ? 12000 : 4000;
                const t = setTimeout(() => {
                    console.log(`[SatsangSessionView] Agent silent for ${silenceTimeout/1000}s in ${currentPhase.key}, advancing phase.`);
                    handleNext();
                }, silenceTimeout);
                return () => clearTimeout(t);
            }
        } else {
            setHasAgentSpokenIntro(false);
        }
    }, [agentIsSpeaking, currentPhase.key, isRunning, hasAgentSpokenIntro, handleNext]);

    // Auto-enable mic when entering QA phase
    useEffect(() => {
        if (currentPhase.key === 'qa' && localParticipant) {
            localParticipant.setMicrophoneEnabled(true).catch(e => 
                console.warn('[SatsangSession] Failed to auto-enable mic for QA phase', e)
            );
        }
    }, [currentPhase.key, localParticipant]);

    // Show phase transition overlay whenever phase changes
    useEffect(() => {
        if (prevPhaseKey !== null && prevPhaseKey !== currentPhase.key) {
            setTransitionLabel(currentPhase.label);
            setTransitionEmoji(PHASE_EMOJI[currentPhase.key] ?? '🕉️');
            setShowTransition(true);

            const timer = setTimeout(() => setShowTransition(false), 1800);
            return () => clearTimeout(timer);
        }
        setPrevPhaseKey(currentPhase.key);
    }, [currentPhase.key]);

    // Format time mm:ss
    const mm = Math.floor(overallSeconds / 60).toString().padStart(2, '0');
    const ss = (overallSeconds % 60).toString().padStart(2, '0');

    const isMeditationPhase = currentPhase.key === 'meditation';
    const isClosingPhase = currentPhase.key === 'closing';
    const showMusicPlayer = isMeditationPhase && meditationAudioUrl;

    return (
        <div className="relative h-full w-full overflow-hidden bg-black text-white flex flex-col font-sans">

            {/* 1. Ambient Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-900 via-stone-900 to-black opacity-90" />
                <motion.div
                    className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                    animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70 scale-105 transform-gpu"
                    style={{
                        backgroundImage: `url('${guruImage || `/images/gurus/${guruId}.jpg`}'), url('/images/placeholder-guru.jpg')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
            </div>

            {/* Phase Transition Overlay */}
            <AnimatePresence>
                {showTransition && (
                    <PhaseTransitionOverlay label={transitionLabel} emoji={transitionEmoji} />
                )}
            </AnimatePresence>

            {/* 2. Top Bar */}
            <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium uppercase tracking-widest text-white/70">{t('privateSatsang.liveSatsang')}</span>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md border border-white/10">
                    {guruName}
                </div>
            </div>

            {/* 3. Center Stage */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center space-y-6 p-6 text-center">

                {/* Rraasi Bhajan Player — visible during bhajan/closing */}
                <AnimatePresence mode="wait">
                    {showMusicPlayer && (
                        <motion.div
                            key="bhajan-player"
                            initial={{ opacity: 0, y: 30, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.96 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="w-full max-w-sm"
                        >
                            <RraasiBhajanPlayer
                                audioUrl={meditationAudioUrl}
                                title={meditationTitle}
                                imageUrl={meditationImageUrl}
                                room={room}
                                forcePause={!isRunning}
                                onEnded={() => {
                                    console.log('[SatsangSessionView] Bhajan ended, auto-advancing phase');
                                    handleNext();
                                }}
                                autoPlay={true}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Circular Phase Icon (Timer Ring Removed) */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhase.key}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="relative"
                    >
                        <div className="relative h-56 w-56 md:h-64 md:w-64">
                            {/* Center Content Only */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <AnimatePresence mode="wait">
                                    {agentIsSpeaking ? (
                                        <motion.div
                                            key="aura"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.8, ease: "easeInOut" }}
                                            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                                        >
                                            <AgentAudioVisualizerAura
                                                state="speaking"
                                                audioTrack={agentAudioTrack as any}
                                                color="#ea580c"
                                                themeMode="dark"
                                                size="xl"
                                                className="w-[150%] h-[150%] md:w-[180%] md:h-[180%]"
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="ring"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.6, ease: "easeInOut" }}
                                            className={cn(
                                                'h-36 w-36 rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(255,165,0,0.2)] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center overflow-hidden z-10',
                                                isRunning && 'border-orange-500/30 shadow-[0_0_80px_rgba(255,165,0,0.4)]'
                                            )}
                                        >
                                            <span className="text-5xl">
                                                {PHASE_EMOJI[currentPhase.key] ?? '🕉️'}
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Phase Title & Timer Text */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm font-medium uppercase tracking-wider backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        {currentPhase.label} {t('privateSatsang.phaseLabel')}
                    </div>

                    <div className="text-6xl md:text-7xl font-extralight tracking-tighter tabular-nums text-white font-sans">
                        {mm}:{ss}
                    </div>
                    <p className="text-white/40 text-sm font-light tracking-wide">
                        {t('privateSatsang.inProgress')} • {phases.findIndex(p => p.key === currentPhase.key) + 1} {t('privateSatsang.of')} {phases.length}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-1 mt-2 bg-white/5 p-2 rounded-full backdrop-blur-sm border border-white/5">
                    {phases.map((p, idx) => {
                        const isActive = p.key === currentPhase.key;
                        const isPast = phases.findIndex(ph => ph.key === currentPhase.key) > idx;

                        return (
                            <motion.div
                                key={p.key}
                                layout
                                className={cn(
                                    'h-2 rounded-full transition-all duration-700 mx-1 cursor-default',
                                    isActive
                                        ? 'w-12 bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                                        : isPast
                                            ? 'w-2 bg-orange-500/40'
                                            : 'w-2 bg-white/10'
                                )}
                                title={p.label}
                            />
                        );
                    })}
                </div>
            </div>

            {/* 4. Bottom Controls (Thumb Zone) */}
            <div className="relative z-20 pb-8 pt-4 px-6 bg-gradient-to-t from-black/90 to-transparent">
                <div className="mx-auto max-w-md flex flex-col gap-6">

                    {/* Main Playback Controls */}
                    <div className="flex items-center justify-between gap-4">

                        {/* Previous */}
                        <button
                            onClick={handlePrev}
                            className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
                        >
                            <SkipBack size={28} />
                        </button>

                        {/* Play/Pause (Hero Button) */}
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.06 }}
                            onClick={isRunning ? handlePause : handleStart}
                            className="h-20 w-20 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/20"
                        >
                            {isRunning
                                ? <Pause size={32} fill="currentColor" />
                                : <Play size={32} fill="currentColor" className="ml-1" />
                            }
                        </motion.button>

                        {/* Next */}
                        <button
                            onClick={handleNext}
                            className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
                        >
                            <SkipForward size={28} />
                        </button>
                    </div>

                    {/* Secondary Actions Row */}
                    <div className="flex items-center justify-between px-4">

                        {/* End Satsang */}
                        <button
                            onClick={onLeave}
                            className="flex items-center justify-center px-6 py-2.5 rounded-full border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors group"
                        >
                            <span className="text-xs uppercase tracking-wider font-semibold group-hover:scale-105 transition-transform">{t('privateSatsang.endSatsang')}</span>
                        </button>

                        {/* Mic Toggle */}
                        <button
                            onClick={toggleMic}
                            className={cn(
                                'flex flex-col items-center gap-1 transition-colors group',
                                isMicrophoneEnabled ? 'text-white' : 'text-white/50'
                            )}
                        >
                            <div className={cn(
                                'p-3 rounded-full transition-colors',
                                isMicrophoneEnabled ? 'bg-white/10 group-hover:bg-white/20' : 'bg-transparent group-hover:bg-white/5'
                            )}>
                                {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold">{t('privateSatsang.micLabel')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
