'use client';

import { useState } from 'react';
import { Play, Pause, BarChart3, Download, Video, Info, Globe, Lock, Heart } from 'lucide-react';
import { VideoPlayerModal } from './video-player-modal';
import { MusicInfoModal } from './music-info-modal';
import { useMusicPlayer, MusicTrack } from '@/contexts/music-player-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/livekit/button';
import { TrackActionsMenu } from './add-to-playlist-menu';
import { SocialShareMenu } from '@/components/shared/social-share-menu';

import { useUserProfile } from '@/hooks/useUserProfile';

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
    onGenerateVideo?: () => void; // New prop
    isSyncing?: boolean; // New prop
    metadata?: any; // Track metadata including tags
    onDownload?: () => void; // New prop
    videoUrl?: string; // New prop
    videoStatus?: 'generating' | 'completed' | 'failed' | null; // New prop
    enableDownload?: boolean; // New prop for server component usage
    shareId?: string; // New prop for overriding share link ID
    story?: string;
    lyrics?: string;
    healingBenefits?: string[];
    tags?: string[];
    isPublic?: boolean; // New prop
    isOwner?: boolean; // New prop
    selectionMode?: boolean; // New prop for bulk select
    isSelected?: boolean; // New prop for bulk select
    onToggleSelection?: () => void; // New prop for bulk select
    onPublishToggle?: (newStatus: boolean) => void; // New prop
    isFavorite?: boolean; // Favorite state
    onToggleFavorite?: () => void; // Toggle favorite
    source?: string; // Track source (e.g. 'private_satsang')
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
    status = 'COMPLETED',
    onSync,
    onGenerateVideo,
    isSyncing = false,
    metadata,
    onDownload,
    videoUrl,
    videoStatus,
    enableDownload = false,
    shareId,
    story,
    lyrics,
    healingBenefits,
    tags,
    isPublic = false,
    isOwner = false,
    selectionMode = false,
    isSelected = false,
    onToggleSelection,
    onPublishToggle,
    isFavorite = false,
    onToggleFavorite,
    source,
}: MusicPlayerCardProps) {
    // ... existing hooks ...
    const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();
    const { profile } = useUserProfile();
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    // ... existing logic ...

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownload) {
            onDownload();
        } else if (enableDownload && audioUrl) {
            window.open(audioUrl, '_blank');
        }
    };

    // ... render logic ... 

    // Inside return JSX, update the download button condition:
    // (This part needs to target the specific button rendering block)

    /* 
       NOTE: The previous ReplaceFileContent tool requires exact matching. 
       I will split this into two edits to be safe.
       1. Update Request Interface and Destructuring.
       2. Update Button Logic.
    */



    // Determine uniqueness (fallback to audioUrl if ID is missing for legacy)
    const trackId = id || audioUrl;

    const displayTitle = title ? title.replace(/^Satsang Medita*tion:\s*/i, '').trim() : 'Untitled';

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
                title: displayTitle,
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

    const handleCardClick = (e: React.MouseEvent) => {
        if (selectionMode && onToggleSelection) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelection();
            return;
        }
        // Could also trigger handlePlayClick if not in selection mode,
        // but current UI uses the play button for this. Let's keep it as is.
    };

    return (
        <div 
            className={cn(
                "group relative rounded-2xl bg-white dark:bg-gray-800 shadow-md transition-all duration-300",
                selectionMode ? "cursor-pointer" : "hover:shadow-xl hover:-translate-y-1",
                isSelected ? "ring-4 ring-amber-500 shadow-amber-500/20 scale-[0.98]" : ""
            )}
            onClick={selectionMode ? handleCardClick : undefined}
        >
            {/* Selection Checkbox Overlay */}
            {selectionMode && (
                <div 
                    className="absolute top-3 left-3 z-40 cursor-pointer pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); onToggleSelection?.(); }}
                >
                    <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors backdrop-blur-md",
                        isSelected 
                            ? "bg-amber-500 border-amber-500 text-white" 
                            : "bg-black/40 border-white/50 hover:bg-black/60 shadow-md"
                    )}>
                        {isSelected && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        )}
                    </div>
                </div>
            )}

            {/* Background Image with Overlay - Isolate overflow here */}
            <div className="absolute inset-0 z-0 h-full w-full overflow-hidden rounded-2xl">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={displayTitle}
                        className={cn(
                            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-110",
                            isPending && "grayscale blur-sm opacity-50"
                        )}
                        onError={(e) => {
                            // Hide broken image and show gradient fallback
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : null}

                {/* Bold Vibrant Gradient Fallback - always present but hidden if image loads */}
                <div
                    className={cn(
                        "absolute inset-0 h-full w-full",
                        imageUrl && "opacity-0 group-hover:opacity-100 transition-opacity",
                        // Random bold gradients based on title hash
                        (() => {
                            const gradients = [
                                "bg-gradient-to-br from-purple-600 via-pink-600 to-red-600",
                                "bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500",
                                "bg-gradient-to-br from-orange-600 via-red-600 to-pink-600",
                                "bg-gradient-to-br from-green-600 via-emerald-500 to-cyan-600",
                                "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600",
                                "bg-gradient-to-br from-amber-600 via-orange-600 to-red-600",
                                "bg-gradient-to-br from-rose-600 via-fuchsia-600 to-purple-600",
                                "bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600",
                            ];
                            const hash = (title || '').split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
                            return gradients[Math.abs(hash) % gradients.length];
                        })()
                    )}
                />

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
                    <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                            {category}
                        </span>
                        {source === 'private_satsang' && (
                            <span className="rounded-full bg-amber-500/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm text-white flex items-center gap-1">
                                🕉️ Satsang
                            </span>
                        )}
                    </div>
                    {isActuallyPlaying && (
                        <div className="flex gap-0.5 items-end h-4 absolute left-1/2 -translate-x-1/2 bottom-1">
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-1 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span className="w-1 bg-amber-400 h-2/3 animate-music-bar-2 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span className="w-1 bg-amber-400 h-full animate-music-bar-3 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        {onToggleFavorite && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite();
                                }}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 border",
                                    isFavorite
                                        ? "bg-rose-500/30 hover:bg-rose-500/50 text-rose-400 border-rose-500/40 scale-110"
                                        : "bg-black/30 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 border-white/10"
                                )}
                                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                            >
                                <Heart className={cn("h-4 w-4 transition-all", isFavorite && "fill-rose-400")} />
                            </button>
                        )}
                        <SocialShareMenu
                            title={displayTitle}
                            text={`Check out this AI spiritual track: "${displayTitle}"\n${description || ''}`}
                            url={`https://www.rraasi.com/track/${shareId || trackId}`}
                            className="pointer-events-auto"
                            iconClassName="h-8 w-8 min-h-8 min-w-8 bg-black/20 backdrop-blur-md hover:bg-black/40 text-white [&_svg]:w-4 [&_svg]:h-4 border-none"
                        />
                        <TrackActionsMenu
                            trackId={trackId}
                            trackTitle={displayTitle}
                            trackDate={createdAt}
                            trackDuration={duration ? parseFloat(duration) : undefined}
                            userName={profile?.name}
                        />
                        {(story || lyrics || (healingBenefits && healingBenefits.length > 0) || description || (tags && tags.length > 0)) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowInfoModal(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 backdrop-blur-md hover:bg-amber-500/40 text-amber-50 transition-colors border border-amber-500/20"
                                title="Learn more about this Track"
                            >
                                <Info className="h-4 w-4" />
                            </button>
                        )}
                        {isOwner && onPublishToggle && !isPending && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPublishToggle(!isPublic);
                                }}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors border",
                                    isPublic 
                                        ? "bg-green-500/20 hover:bg-green-500/40 text-green-400 border-green-500/30" 
                                        : "bg-gray-500/20 hover:bg-gray-500/40 text-gray-300 border-gray-500/30"
                                )}
                                title={isPublic ? "Public in Community (Click to make Private)" : "Private (Click to publish to Community)"}
                            >
                                {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </button>
                        )}
                        {(onDownload || enableDownload) && !isPending && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDownload) {
                                        onDownload();
                                    } else if (enableDownload && audioUrl) {
                                        window.open(audioUrl, '_blank');
                                    }
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
                                {displayTitle}
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

            {/* Video Player Modal */}
            {videoUrl && (
                <VideoPlayerModal
                    isOpen={showVideoModal}
                    onClose={() => setShowVideoModal(false)}
                    videoUrl={videoUrl}
                    title={displayTitle}
                />
            )}

            {/* Music Info Modal */}
            <MusicInfoModal
                isOpen={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title={displayTitle}
                story={story}
                lyrics={lyrics}
                healingBenefits={healingBenefits}
                tags={tags}
                description={description}
            />

            {/* Video Action Button (Overlay helper) */}
            {videoUrl && !isPending && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-in fade-in zoom-in duration-300">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowVideoModal(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 shadow-xl group/vid"
                    >
                        <Video className="w-4 h-4 text-amber-400 group-hover/vid:text-amber-300" />
                        <span className="text-[11px] font-bold tracking-wide uppercase">Watch Video</span>
                    </button>
                </div>
            )}

            {/* Create Video Button */}
            {!videoUrl && !isPending && videoStatus !== 'generating' && onGenerateVideo && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-in fade-in zoom-in duration-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onGenerateVideo();
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 shadow-xl group/vid"
                        title="Generate Music Video (Cost: Credits)"
                    >
                        <Video className="w-4 h-4 text-white group-hover/vid:text-amber-300" />
                        <span className="text-[11px] font-bold tracking-wide uppercase">Create Video</span>
                    </button>
                </div>
            )}

            {/* Video Generating Indicator */}
            {videoStatus === 'generating' && !isPending && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-pulse">
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-amber-200 border border-amber-500/30 shadow-xl">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                        <span className="text-[11px] font-bold uppercase">Making Video...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
