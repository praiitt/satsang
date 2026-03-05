'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music2 } from 'lucide-react';
import { Room, RoomEvent } from 'livekit-client';

interface RraasiBhajanPlayerProps {
    audioUrl: string | null | undefined;
    title?: string | null;
    imageUrl?: string | null;
    /** LiveKit room for receiving agent play/pause commands */
    room?: Room | null;
    /** Called when audio finishes playing */
    onEnded?: () => void;
    /** Whether to autoplay when audioUrl is set */
    autoPlay?: boolean;
    className?: string;
}

/**
 * RraasiBhajanPlayer
 * Plays internal rraasi music tracks during private satsang bhajan / closing phases.
 * Optionally listens to LiveKit data channel for agent play/pause/stop commands.
 */
export function RraasiBhajanPlayer({
    audioUrl,
    title,
    imageUrl,
    room,
    onEnded,
    autoPlay = true,
    className = '',
}: RraasiBhajanPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [autoplayFailed, setAutoplayFailed] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Listen to LiveKit data channel for agent bhajan commands
    useEffect(() => {
        if (!room) return;

        const handleData = (payload: Uint8Array, _participant: unknown, _kind: unknown, _topic?: string) => {
            try {
                const text = new TextDecoder().decode(payload);
                const msg = JSON.parse(text ?? '{}');

                if (msg?.type === 'bhajan') {
                    if (msg.action === 'pause' || msg.action === 'stop') {
                        audioRef.current?.pause();
                        setIsPlaying(false);
                    } else if (msg.action === 'play') {
                        setAutoplayFailed(false);
                        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {
                            setAutoplayFailed(true);
                        });
                    }
                }
            } catch { /* ignore parse errors */ }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room]);


    // Set up audio element
    useEffect(() => {
        if (!audioUrl) return;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
            if (audio.duration > 0) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
            onEnded?.();
        });

        audio.addEventListener('error', (e) => {
            console.error('[RraasiBhajanPlayer] Audio error:', e);
            setIsPlaying(false);
        });

        if (autoPlay) {
            audio.play().then(() => {
                setIsPlaying(true);
                setAutoplayFailed(false);
            }).catch((err) => {
                console.warn('[RraasiBhajanPlayer] Autoplay prevented by browser:', err);
                // Autoplay blocked — user will need to press play manually
                setAutoplayFailed(true);
                setIsPlaying(false);
            });
        }

        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [audioUrl]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            setAutoplayFailed(false);
            audio.play().then(() => setIsPlaying(true)).catch(e => console.error("Play failed", e));
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = x / rect.width;
        audio.currentTime = ratio * duration;
    };

    const formatTime = (secs: number) => {
        if (!isFinite(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    if (!audioUrl) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="rraasi-player"
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`w-full max-w-md mx-auto rounded-2xl overflow-hidden border ${autoplayFailed ? 'border-orange-500 shadow-orange-500/50 cursor-pointer animate-pulse' : 'border-orange-500/20 shadow-orange-900/30'
                    } bg-black/60 backdrop-blur-xl shadow-2xl ${className}`}
                onClick={autoplayFailed ? togglePlay : undefined}
            >
                {/* Autoplay failed overlay prompt */}
                {autoplayFailed && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600 text-white font-medium shadow-xl">
                            <Play className="w-4 h-4 fill-white" />
                            <span>Tap to play Meditation Music</span>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4 p-4">
                    {/* Album Art */}
                    <div className="relative flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden border border-white/10">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={title || 'Bhajan'}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-gradient-to-br from-orange-900 to-stone-900 flex items-center justify-center">
                                <Music2 className="w-6 h-6 text-orange-400/60" />
                            </div>
                        )}
                        {/* Spinning animation overlay when playing */}
                        {isPlaying && (
                            <div className="absolute inset-0 rounded-xl border-2 border-orange-500/50 animate-pulse" />
                        )}
                    </div>

                    {/* Info + Controls */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="min-w-0">
                                <p className="text-[10px] text-orange-400/70 uppercase tracking-widest font-medium">
                                    🕉️ Rraasi Bhajan
                                </p>
                                <p className="text-white font-medium text-sm truncate">
                                    {title || 'Bhajan'}
                                </p>
                            </div>

                            {/* Play/Pause Button */}
                            <button
                                onClick={togglePlay}
                                className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/50 hover:scale-110 active:scale-95 transition-all"
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? (
                                    <Pause className="w-4 h-4 text-white fill-white" />
                                ) : (
                                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                )}
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div
                            className="group relative h-1.5 w-full rounded-full bg-white/10 cursor-pointer"
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                            {/* Scrubber dot */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress}% - 6px)` }}
                            />
                        </div>

                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-white/30">{formatTime(currentTime)}</span>
                            <span className="text-[10px] text-white/30">{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>

                {/* Waveform animation when playing */}
                {isPlaying && (
                    <div className="flex items-end justify-center gap-0.5 h-4 px-4 pb-2">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="w-1 rounded-full bg-orange-500/40"
                                style={{
                                    height: `${Math.random() * 10 + 4}px`,
                                    animationName: 'pulse',
                                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                                    animationTimingFunction: 'ease-in-out',
                                    animationIterationCount: 'infinite',
                                    animationDirection: 'alternate',
                                    animationDelay: `${i * 0.05}s`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
