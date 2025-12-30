'use client';

import { useEffect, useState } from 'react';
import { Room } from 'livekit-client';
import { Button } from '@/components/livekit/button';
import { useSatsangLogic, Durations } from '@/hooks/useSatsangLogic';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';

interface SatsangSessionViewProps {
    room: Room | null;
    guruName: string;
    guruId: string; // Used for background image lookup if needed
    durations: Durations;
    onLeave: () => void;
}

export function SatsangSessionView({
    room,
    guruName,
    guruId,
    durations,
    onLeave
}: SatsangSessionViewProps) {

    const {
        currentPhase,
        remaining,
        isRunning,
        phases,
        handleStart,
        handlePause,
        handleNext,
        handlePrev
    } = useSatsangLogic({
        room,
        durations,
        config: { topic: 'Spiritual Wisdom' }, // topic could be dynamic later
        onLeave
    });

    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant({ room: room || undefined });

    const toggleMic = async () => {
        if (isMicrophoneEnabled) {
            await localParticipant.setMicrophoneEnabled(false);
        } else {
            await localParticipant.setMicrophoneEnabled(true);
        }
    };

    // Format time mm:ss
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    // Animation variants
    const backgroundVariants = {
        animate: {
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
            transition: { duration: 10, repeat: Infinity, ease: "easeInOut" }
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-black text-white flex flex-col font-sans">

            {/* 1. Ambient Background Layer */}
            <div className="absolute inset-0 z-0">
                {/* Guru Image / Placeholder with blur */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-900 via-stone-900 to-black opacity-90" />
                <motion.div
                    className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                    variants={backgroundVariants}
                    animate="animate"
                    style={{
                        backgroundImage: `url('/images/gurus/${guruId}.jpg'), url('/images/placeholder-guru.jpg')`,
                        // Fallback gradient if image fails
                        background: `radial-gradient(circle at center, rgba(255,165,0,0.3) 0%, rgba(0,0,0,0.8) 100%)`
                    }}
                />
                {/* Overlay gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
            </div>

            {/* 2. Top Bar */}
            <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium uppercase tracking-widest text-white/70">Live Satsang</span>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md border border-white/10">
                    {guruName}
                </div>
            </div>

            {/* 3. Center Stage (Visualizer & Phase Info) */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center space-y-8 p-6 text-center">

                {/* Guru Avatar Bubble */}
                <div className="relative mb-4">
                    <div className={cn(
                        "h-32 w-32 rounded-full border-4 border-white/20 shadow-[0_0_40px_rgba(255,165,0,0.3)] bg-stone-800 flex items-center justify-center overflow-hidden transition-all duration-700",
                        isRunning && "border-orange-500/50 shadow-[0_0_60px_rgba(255,165,0,0.6)] scale-105"
                    )}>
                        <span className="text-4xl">🧘</span>
                        {/* Can replace with actual <img src=...> if available */}
                    </div>
                </div>

                {/* Phase Title & Timer */}
                <div className="space-y-2">
                    <h2 className="text-3xl font-light text-white/90 tracking-wide font-serif">
                        {currentPhase.label}
                    </h2>
                    <div className="text-5xl font-extralight tracking-tighter tabular-nums text-orange-50">
                        {mm}:{ss}
                    </div>
                </div>

                {/* Progress Dots */}
                <div className="flex gap-2 mt-4">
                    {phases.map((p, idx) => (
                        <div
                            key={p.key}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-500",
                                idx === phases.findIndex(ph => ph.key === currentPhase.key) ? "w-8 bg-orange-500" : "w-1.5 bg-white/20"
                            )}
                        />
                    ))}
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
                            className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <SkipBack size={28} />
                        </button>

                        {/* Play/Pause (Hero Button) */}
                        <button
                            onClick={isRunning ? handlePause : handleStart}
                            className="h-20 w-20 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>

                        {/* Next */}
                        <button
                            onClick={handleNext}
                            className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <SkipForward size={28} />
                        </button>
                    </div>

                    {/* Secondary Actions Row */}
                    <div className="flex items-center justify-between px-4">

                        {/* End Call */}
                        <button
                            onClick={onLeave}
                            className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300 transition-colors group"
                        >
                            <div className="p-3 rounded-full bg-red-500/10 group-hover:bg-red-500/20">
                                <PhoneOff size={20} />
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold">End</span>
                        </button>

                        {/* Mic Toggle */}
                        <button
                            onClick={toggleMic}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-colors group",
                                isMicrophoneEnabled ? "text-white" : "text-white/50"
                            )}
                        >
                            <div className={cn(
                                "p-3 rounded-full transition-colors",
                                isMicrophoneEnabled ? "bg-white/10 group-hover:bg-white/20" : "bg-transparent group-hover:bg-white/5"
                            )}>
                                {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold">Mic</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
