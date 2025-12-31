'use client';

import { Play, Pause, BarChart3 } from 'lucide-react';
import { useMusicPlayer, MusicTrack } from '@/contexts/music-player-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/livekit/button';

interface MusicPlayerCardProps {
    id?: string; // Add ID if not already there
    title: string;
    audioUrl: string;
    category?: string;
    duration?: string;
    prompt?: string;
    createdAt?: string;
    onPlay?: () => void;
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
                createdAt
            };
            playTrack(track);
            onPlay?.();
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden group border border-transparent dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-900/50">
            {/* Category & Status Badge */}
            <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                    {category}
                </span>
                {isActuallyPlaying && (
                    <div className="flex gap-0.5 items-end h-3">
                        <span className="w-0.5 bg-amber-500 h-full animate-music-bar-1"></span>
                        <span className="w-0.5 bg-amber-500 h-2/3 animate-music-bar-2"></span>
                        <span className="w-0.5 bg-amber-500 h-full animate-music-bar-3"></span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className={cn(
                        "text-lg font-bold transition-colors line-clamp-2",
                        isActuallyPlaying ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"
                    )}>
                        {title}
                    </h3>
                </div>

                {prompt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 h-8">
                        {prompt}
                    </p>
                )}

                {/* Player Controls */}
                <div className="flex items-center gap-3 mt-auto">
                    <button
                        onClick={handlePlayClick}
                        className={cn(
                            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md transform hover:scale-105",
                            isActuallyPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200"
                        )}
                        aria-label={isActuallyPlaying ? "Pause" : "Play"}
                    >
                        {isActuallyPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                        ) : (
                            <Play className="w-5 h-5 ml-0.5 fill-current" />
                        )}
                    </button>

                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {isActuallyPlaying ? "Now Playing" : "Listen"}
                        </span>
                        {createdAt && (
                            <span className="text-[10px] text-gray-400">
                                {new Date(createdAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
