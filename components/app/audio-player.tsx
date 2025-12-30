'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/livekit/button';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
    src: string;
    title?: string;
    className?: string;
    autoPlay?: boolean;
}

export function AudioPlayer({ src, title, className, autoPlay = false }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (autoPlay) {
            audio.play().catch(console.error);
        }

        const updateProgress = () => {
            const current = audio.currentTime;
            const durationVal = audio.duration;
            setCurrentTime(current);
            setDuration(durationVal);
            setProgress((current / durationVal) * 100);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [autoPlay, src]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                // Pause other audios if any (simple approach: relying on user to pause others)
                // Or we could use a global context, but keeping it simple for now.
                audioRef.current.play();
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        if (audioRef.current) {
            const time = (value / 100) * audioRef.current.duration;
            audioRef.current.currentTime = time;
            setProgress(value);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            const newMuted = !isMuted;
            audioRef.current.muted = newMuted;
            setIsMuted(newMuted);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.volume = value;
            setVolume(value);
            setIsMuted(value === 0);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={cn(
                'bg-background/80 group relative flex w-full flex-col gap-2 rounded-xl border p-3 backdrop-blur-sm transition-all hover:bg-background',
                className
            )}
        >
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Title if provided */}
            {title && (
                <div className="absolute -top-3 left-3 bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground rounded-full shadow-sm max-w-[80%] truncate">
                    {title}
                </div>
            )}

            <div className="flex items-center gap-3 pt-1">
                <Button
                    onClick={togglePlay}
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full shadow-sm transition-transform active:scale-95"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current pl-0.5" />}
                </Button>

                <div className="flex flex-1 flex-col justify-center gap-1.5">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress || 0}
                        onChange={handleSeek}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                        style={{
                            backgroundSize: `${progress}% 100%`,
                            backgroundImage: 'linear-gradient(to right,  var(--primary) 0%, var(--primary) 100%)',
                            backgroundRepeat: 'no-repeat',
                        }}
                    />
                    <div className="flex justify-between px-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="group/volume relative flex items-center justify-end">
                    <Button
                        onClick={toggleMute}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>

                    {/* Volume slider tooltip-ish popup on hover could be better, but inline for now */}
                    <div className="hidden w-20 pl-2 group-hover/volume:block absolute right-8 top-1/2 -translate-y-1/2 bg-popover/90 p-2 rounded-lg shadow-lg">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="h-1.5 w-full cursor-pointer rounded-full accent-primary"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
