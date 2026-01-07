'use client';

import { Play, Pause, BarChart3 } from 'lucide-react';
import { useMusicPlayer, MusicTrack } from '@/contexts/music-player-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/livekit/button';

interface MusicPlayerCardProps {
    id?: string;
    title: string;
    audioUrl: string;
    category?: string;
    duration?: string;
    prompt?: string;
    description?: string; // Add description
    createdAt?: string;
    onPlay?: () => void;
    imageUrl?: string; // New prop
}

export function MusicPlayerCard({
    id,
    title,
    audioUrl,
    category = 'Music',
    duration,
    prompt,
    description, // Add description
    createdAt,
    onPlay,
    imageUrl,
}: MusicPlayerCardProps) {
    const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();

    // Determine uniqueness (fallback to audioUrl if ID is missing for legacy)
    const trackId = id || audioUrl;

    // Check if THIS track is the one playing globally
    const isCurrentTrack = currentTrack?.id === trackId || currentTrack?.audioUrl === audioUrl;
    const isActuallyPlaying = isCurrentTrack && isPlaying;

    const handlePlayClick = () => {
        if (isCurrentTrack) {
            togglePlayPause();
        } else {
            // Construct the track object
            const track: MusicTrack = {
                id: trackId,
                title,
                audioUrl,
                category,
                prompt,
                description, // Pass description
                createdAt,
                imageUrl // Pass image to context if supported
            };
            playTrack(track);
            onPlay?.();
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0 h-full w-full">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-900/40 dark:to-purple-900/40" />
                )}
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex h-64 flex-col justify-between p-5 text-white pointer-events-none">
                {/* Top Row: Category & Status */}
                <div className="flex items-center justify-between pointer-events-auto">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                        {category}
                    </span>
                    {isActuallyPlaying && (
                        <div className="flex gap-0.5 items-end h-4">
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-1 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span className="w-1 bg-amber-400 h-2/3 animate-music-bar-2 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-3 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                        </div>
                    )}
                </div>

                {/* Bottom Row: Controls (Always visible) */}
                <div className="flex items-center gap-3 pointer-events-auto transition-transform duration-300 group-hover:-translate-y-2">
                    <button
                        onClick={handlePlayClick}
                        className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 active:scale-95 group/btn",
                            isActuallyPlaying
                                ? "bg-amber-500 text-white hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                : "bg-white/20 text-white hover:bg-white hover:text-black"
                        )}
                        aria-label={isActuallyPlaying ? "Pause" : "Play"}
                    >
                        {isActuallyPlaying ? (
                            <Pause className="h-5 w-5 fill-current" />
                        ) : (
                            <Play className="h-5 w-5 ml-1 fill-current" />
                        )}
                    </button>
                    <div className="flex flex-col">
                        <h3 className={cn(
                            "text-lg font-bold leading-tight tracking-tight text-white shadow-black drop-shadow-md line-clamp-1",
                            isActuallyPlaying && "text-amber-400"
                        )}>
                            {title}
                        </h3>
                        <span className="text-xs font-medium opacity-80">
                            {isActuallyPlaying ? "Now Playing" : "Play Track"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Premium Glassmorphism Description Overlay */}
            <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) group-hover:translate-y-0">
                <div className="flex flex-col gap-2 bg-black/60 p-5 backdrop-blur-xl border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-400">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4 animate-pulse"
                            >
                                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                                Creation Story
                            </span>
                        </div>
                        {/* Overlay Play Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlayClick();
                            }}
                            className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 p-2 rounded-full transition-colors backdrop-blur-md"
                            aria-label="Play track"
                        >
                            {isActuallyPlaying ? (
                                <Pause className="h-4 w-4 fill-current" />
                            ) : (
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                            )}
                        </button>
                    </div>

                    <p className="text-sm font-medium leading-relaxed italic text-white/90 line-clamp-4">
                        "{description || prompt || "A beautiful spiritual composition created by RRAASI AI."}"
                    </p>

                    {createdAt && (
                        <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
                            <span className="text-[10px] text-white/50">
                                Created on {new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
