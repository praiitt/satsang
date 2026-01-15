'use client';

import { Play, Pause, BarChart3, Download } from 'lucide-react';
import { useMusicPlayer, MusicTrack } from '@/contexts/music-player-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/livekit/button';
import { AddToPlaylistMenu } from './add-to-playlist-menu';
import { SocialShareMenu } from '@/components/shared/social-share-menu';

interface MusicPlayerCardProps {
    id?: string;
    title: string;
    audioUrl: string;
    category?: string;
    duration?: string;
    prompt?: string;
    description?: string; // Add description
    createdAt?: string;
    status?: string; // New prop
    onSync?: () => void; // New prop
    isSyncing?: boolean; // New prop
    metadata?: any; // Track metadata including tags
    onDownload?: () => void; // New prop
}

export function MusicPlayerCard({
    id,
    title,
    audioUrl,
    category = 'Music',
    duration,
    prompt,
    description,
    createdAt,
    onPlay,
    imageUrl,
    status = 'COMPLETED', // Default to completed for backward purity
    onSync,
    isSyncing = false,
    metadata,
    onDownload,
}: MusicPlayerCardProps) {
    const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();

    // Determine uniqueness (fallback to audioUrl if ID is missing for legacy)
    const trackId = id || audioUrl;

    // Check if THIS track is the one playing globally
    const isCurrentTrack = currentTrack?.id === trackId || currentTrack?.audioUrl === audioUrl;
    const isActuallyPlaying = isCurrentTrack && isPlaying;

    // Check if track is pending/generating
    const isPending = status === 'generating' || status === 'submitted' || !audioUrl;

    const handlePlayClick = () => {
        if (isPending) return; // Cannot play pending tracks

        if (isCurrentTrack) {
            togglePlayPause();
        } else if (onPlay) {
            // If onPlay is provided, let parent handle it (e.g. for Playlist context)
            onPlay();
        } else {
            // Fallback: Play single track
            const track: MusicTrack = {
                id: trackId,
                title,
                audioUrl,
                category,
                prompt,
                description,
                createdAt,
                imageUrl
            };
            playTrack(track);
        }
    };

    return (
        <div className="group relative rounded-2xl bg-white dark:bg-gray-800 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            {/* Background Image with Overlay - Isolate overflow here */}
            <div className="absolute inset-0 z-0 h-full w-full overflow-hidden rounded-2xl">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className={cn(
                            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-110",
                            isPending && "grayscale blur-sm opacity-50"
                        )}
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-900/40 dark:to-purple-900/40" />
                )}
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            {/* Pending Overlay */}
            {isPending && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mb-1"></div>
                        <span className="text-amber-400 font-bold text-sm tracking-widest uppercase">
                            Creating Magic...
                        </span>
                        {onSync && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSync();
                                }}
                                disabled={isSyncing}
                                className="mt-2 h-8 text-xs border-white/20 hover:bg-white/10 text-white bg-black/30 backdrop-blur-md"
                            >
                                {isSyncing ? 'Syncing...' : 'Refresh Status'}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="relative z-10 flex h-64 flex-col justify-between p-5 text-white pointer-events-none">
                {/* Top Row: Category & Status */}
                <div className="relative z-30 flex items-center justify-between pointer-events-auto">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                        {category}
                    </span>
                    {isActuallyPlaying && (
                        <div className="flex gap-0.5 items-end h-4 absolute left-1/2 -translate-x-1/2 bottom-1">
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-1 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span className="w-1 bg-amber-400 h-2/3 animate-music-bar-2 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-3 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <SocialShareMenu
                            title={title}
                            text={`Check out this AI spiritual track: "${title}"\n${description || ''}`}
                            url={`https://rraasi.com/suno/track/${trackId}`}
                            className="bg-black/20 backdrop-blur-md rounded-full pointer-events-auto"
                        />
                        <AddToPlaylistMenu trackId={trackId} />
                        {onDownload && !isPending && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload();
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 text-white transition-colors"
                                title="Download"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Controls & Description */}
                <div className="flex flex-col gap-2 pointer-events-auto transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePlayClick}
                            className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 active:scale-95 group/btn",
                                isPending && "opacity-50 cursor-not-allowed bg-gray-500",
                                !isPending && (isActuallyPlaying
                                    ? "bg-amber-500 text-white hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                    : "bg-white/20 text-white hover:bg-white hover:text-black")
                            )}
                            disabled={isPending}
                            aria-label={isActuallyPlaying ? "Pause" : "Play"}
                        >
                            {isActuallyPlaying ? (
                                <Pause className="h-5 w-5 fill-current" />
                            ) : (
                                <Play className="h-5 w-5 ml-1 fill-current" />
                            )}
                        </button>
                        <div className="flex flex-col min-w-0">
                            <h3 className={cn(
                                "text-lg font-bold leading-tight tracking-tight text-white shadow-black drop-shadow-md truncate",
                                isActuallyPlaying && "text-amber-400"
                            )}>
                                {title}
                            </h3>
                            <span className="text-xs font-medium opacity-80">
                                {isPending ? "Generating..." : (isActuallyPlaying ? "Now Playing" : "Play Track")}
                            </span>
                        </div>
                    </div>

                    {/* Integrated Description - Always visible */}
                    {!isPending && (
                        <p className="text-[10px] text-white/80 line-clamp-2 font-medium leading-relaxed pl-1 drop-shadow-md">
                            "{description || prompt || (typeof metadata === 'object' && metadata?.tags) || "A beautiful spiritual composition created by RRAASI AI."}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
