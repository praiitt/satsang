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
            <div className="relative z-10 flex h-64 flex-col justify-between p-5 text-white">
                {/* Top Row: Category & Status */}
                <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                        {category}
                    </span>
                    {isActuallyPlaying && (
                        <div className="flex gap-0.5 items-end h-4">
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-1" />
                            <span className="w-1 bg-amber-400 h-2/3 animate-music-bar-2" />
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-3" />
                        </div>
                    )}
                </div>

                {/* Bottom Row: Info & Controls */}
                <div className="space-y-3">
                    <div>
                        <h3 className={cn(
                            "text-xl font-bold leading-tight tracking-tight text-white mb-1 shadow-black drop-shadow-md line-clamp-2",
                            isActuallyPlaying && "text-amber-400"
                        )}>
                            {title}
                        </h3>
                        {prompt && (
                            <p className="line-clamp-2 text-xs text-gray-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                {prompt}
                            </p>
                        )}
                        {createdAt && (
                            <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(createdAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePlayClick}
                            className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 active:scale-95",
                                isActuallyPlaying
                                    ? "bg-amber-500 text-white hover:bg-amber-400"
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
                        <span className="text-sm font-medium">
                            {isActuallyPlaying ? "Now Playing" : "Play Track"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
