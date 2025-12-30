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
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center space-y-10 p-6 text-center">

                {/* Circular Progress Timer */}
                <div className="relative">
                    {/* SVG Circle */}
                    <div className="relative h-64 w-64 md:h-72 md:w-72">
                        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                            {/* Track */}
                            <circle
                                className="text-white/10"
                                strokeWidth="4"
                                stroke="currentColor"
                                fill="transparent"
                                r="45"
                                cx="50"
                                cy="50"
                            />
                            {/* Progress */}
                            <circle
                                className="text-orange-500 transition-all duration-1000 ease-linear"
                                strokeWidth="4"
                                strokeDasharray={2 * Math.PI * 45} // approx 282.7
                                strokeDashoffset={(2 * Math.PI * 45) * (1 - (remaining / (durations[currentPhase.key] || 1)))}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="45"
                                cx="50"
                                cy="50"
                            />
                        </svg>

                        {/* Center Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className={cn(
                                "h-40 w-40 rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(255,165,0,0.2)] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center overflow-hidden transition-all duration-1000",
                                isRunning && "border-orange-500/30 shadow-[0_0_80px_rgba(255,165,0,0.4)]"
                            )}>
                                <span className="text-6xl animate-pulse delay-700">🕉️</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phase Title & Timer Text */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm font-medium uppercase tracking-wider backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        {currentPhase.label} Phase
                    </div>

                    <div className="text-6xl md:text-7xl font-extralight tracking-tighter tabular-nums text-white font-sans">
                        {mm}:{ss}
                    </div>
                    <p className="text-white/40 text-sm font-light tracking-wide">
                        In Progress • {phases.findIndex(p => p.key === currentPhase.key) + 1} of {phases.length}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-1 mt-4 bg-white/5 p-2 rounded-full backdrop-blur-sm border border-white/5">
                    {phases.map((p, idx) => {
                        const isActive = p.key === currentPhase.key;
                        const isPast = phases.findIndex(ph => ph.key === currentPhase.key) > idx;

                        return (
                            <div
                                key={p.key}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-700 mx-1",
                                    isActive ? "w-12 bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" :
                                        isPast ? "w-2 bg-orange-500/40" : "w-2 bg-white/10"
                                )}
                            />
                        )
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
