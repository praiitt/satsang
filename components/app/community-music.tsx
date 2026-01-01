'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Music } from 'lucide-react';
import { Button } from '@/components/livekit/button';
import { AudioPlayer } from '@/components/app/audio-player';

interface Track {
    id: string;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    createdAt: { _seconds: number; _nanoseconds: number };
    userId: string;
}

interface TracksResponse {
    tracks: Track[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
}

export function CommunityMusic() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 24;

    const fetchTracks = async (pageNum: number) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/suno/community-tracks?page=${pageNum}&limit=${LIMIT}`);
            if (!res.ok) throw new Error('Failed to fetch tracks');

            const data: TracksResponse = await res.json();
            setTracks(data.tracks);
            setTotalPages(data.totalPages);
            setPage(data.page);
        } catch (error) {
            console.error('Error fetching community tracks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTracks(page);
    }, [page]);

    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(p => p + 1);
    };

    return (
        <div className="w-full space-y-8">
            {/* Grid of Tracks */}
            {loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-muted/20 h-64 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : tracks.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tracks.map((track) => (
                        <div
                            key={track.id}
                            className="bg-card group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md"
                        >
                            {/* Image / Thumbnail */}
                            <div className="bg-muted/30 relative aspect-square w-full overflow-hidden">
                                {track.imageUrl ? (
                                    <img
                                        src={track.imageUrl}
                                        alt={track.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                                        <Music className="h-20 w-20" />
                                    </div>
                                )}

                                {/* Overlay gradient for better text visibility if needed */}
                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="line-clamp-1 text-lg font-semibold tracking-tight" title={track.title}>
                                    {track.title || 'Untitled Track'}
                                </h3>
                                <p className="text-muted-foreground text-xs">
                                    {new Date(track.createdAt._seconds * 1000).toLocaleDateString()}
                                </p>

                                <div className="mt-4">
                                    <AudioPlayer src={track.audioUrl} title={track.title} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                    <Music className="mb-4 h-12 w-12 opacity-20" />
                    <p>No community tracks found yet.</p>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-8">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrevPage}
                        disabled={page <= 1}
                        className="rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextPage}
                        disabled={page >= totalPages}
                        className="rounded-full"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
