'use client';

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioDemoPlayerProps {
    src: string;
    title: string;
    description?: string;
    color?: string; // Tailwind text color class, e.g. "text-rose-400"
}

export function AudioDemoPlayer({
    src,
    title,
    description = "AI Generated Preview",
    color = "text-gold-400"
}: AudioDemoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize Audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio(src);
            audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
            audioRef.current.addEventListener('ended', handleEnded);

            return () => {
                audioRef.current?.pause();
                audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
                audioRef.current?.removeEventListener('ended', handleEnded);
            };
        }
    }, [src]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration || 1;
            setProgress((current / duration) * 100);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().catch(e => console.log("Playback failed", e));
                setIsPlaying(true);
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl transition-all hover:border-white/20">
            <div className="flex items-center gap-4">
                {/* Play Button */}
                <button
                    onClick={togglePlay}
                    className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 shadow-lg shrink-0",
                        isPlaying
                            ? "bg-white text-black scale-95"
                            : "bg-white/10 text-white hover:bg-white/20 hover:scale-105"
                    )}
                >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                </button>

                {/* Info & Waveform */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center">
                        <h4 className="text-white font-medium truncate pr-2">{title}</h4>
                        {isPlaying && <Volume2 className={cn("w-4 h-4 animate-pulse", color)} />}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{description}</p>

                    {/* Progress Bar / Fake Waveform */}
                    <div className="relative h-8 mt-2 flex items-center gap-0.5 opacity-80">
                        {/* Simple visualizer bars that animate when playing */}
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-1 rounded-full transition-all duration-300",
                                    color.replace('text-', 'bg-'),
                                    isPlaying ? "animate-music-bar" : "h-1 opacity-30"
                                )}
                                style={{
                                    height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '4px',
                                    animationDelay: `${i * 0.05}s`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrubber Background */}
            <div className="relative w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div
                    className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-100", color.replace('text-', 'bg-'))}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
