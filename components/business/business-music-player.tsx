'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Volume2, VolumeX, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessMusicPlayerProps {
    currentTrack?: {
        title: string;
        style: string;
        url: string;
    };
    isPlaying: boolean;
    onPlayPause: () => void;
    onNext: () => void;
    status: 'idle' | 'generating' | 'playing' | 'error';
}

export function BusinessMusicPlayer({
    currentTrack,
    isPlaying,
    onPlayPause,
    onNext,
    status,
}: BusinessMusicPlayerProps) {
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(console.error);
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentTrack]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                {/* Track Info */}
                <div className="flex w-1/3 min-w-[200px] flex-col overflow-hidden">
                    <AnimatePresence mode="wait">
                        {currentTrack ? (
                            <motion.div
                                key={currentTrack.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col"
                            >
                                <h3 className="truncate text-lg font-semibold text-foreground">
                                    {currentTrack.title}
                                </h3>
                                <p className="truncate text-sm text-muted-foreground">{currentTrack.style}</p>
                            </motion.div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Activity className="animate-pulse" size={20} />
                                <span>Waiting for tailored selection...</span>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    <button onClick={onPlayPause} className="rounded-full bg-primary p-4 text-primary-foreground hover:bg-primary/90 transition-colors">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>

                    <button
                        onClick={onNext}
                        disabled={status === 'generating'}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                        <SkipForward size={24} />
                    </button>
                </div>

                {/* Volume & Status */}
                <div className="flex w-1/3 justify-end items-center gap-4">
                    {status === 'generating' && (
                        <div className="flex items-center gap-2 text-sm text-amber-500">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                            Curating next track...
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground hover:text-foreground">
                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-24 accent-primary"
                        />
                    </div>
                </div>

                {currentTrack && (
                    <audio
                        ref={audioRef}
                        src={currentTrack.url}
                        onEnded={onNext}
                        className="hidden"
                    />
                )}
            </div>
        </div>
    );
}
