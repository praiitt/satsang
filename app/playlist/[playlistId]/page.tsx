'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Play, Music, Share2, Check, Headphones, Loader2 } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/music-player-context';
import Link from 'next/link';

interface Track {
    id: string;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    category?: string;
    duration?: number;
}

interface Playlist {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    tracks: Track[];
}

function formatDuration(seconds?: number) {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function flattenTracks(rawTracks: any[]): Track[] {
    return rawTracks.flatMap((t: any) => {
        if (t.tracks && Array.isArray(t.tracks) && t.tracks.length > 0) {
            return t.tracks
                .filter((sub: any) => sub.audioUrl || sub.audio_url)
                .map((sub: any, idx: number) => ({
                    id: sub.sunoId || `${t.id}_${idx}`,
                    title: t.tracks.length > 1 ? `${t.title || 'Untitled'} (${idx + 1})` : (t.title || 'Untitled'),
                    audioUrl: sub.audioUrl || sub.audio_url,
                    imageUrl: sub.imageUrl || sub.sourceImageUrl || t.imageUrl || t.image_url || t.thumbnailUrl,
                    category: t.category,
                    duration: sub.duration || t.duration,
                }));
        }
        const audioUrl = t.audioUrl || t.audio_url;
        if (!audioUrl) return [];
        return [{
            id: t.id || t.trackId,
            title: t.title || 'Untitled',
            audioUrl,
            imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
            category: t.category,
            duration: t.duration,
        }];
    });
}

export default function PublicPlaylistPage() {
    const params = useParams();
    const playlistId = params?.playlistId as string;

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

    const { playTrack, playPlaylist, currentTrack, isPlaying } = useMusicPlayer();

    useEffect(() => {
        if (!playlistId) return;
        fetch(`/api/playlists/${playlistId}`)
            .then(res => {
                if (!res.ok) throw new Error('Playlist not found or not public');
                return res.json();
            })
            .then(data => {
                const tracks = flattenTracks(data.tracks || []);
                setPlaylist({ ...data, tracks });
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [playlistId]);

    const handleShare = useCallback(async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: playlist?.name, url });
        } else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    }, [playlist]);

    const handlePlayAll = useCallback(() => {
        if (!playlist?.tracks.length) return;
        playPlaylist(playlist.tracks, 0);
        setActiveTrackId(playlist.tracks[0].id);
    }, [playlist, playPlaylist]);

    const handlePlayTrack = useCallback((track: Track, index: number) => {
        if (!playlist) return;
        playPlaylist(playlist.tracks, index);
        setActiveTrackId(track.id);
    }, [playlist, playPlaylist]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-950 via-zinc-900 to-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-white">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
                    <p className="text-amber-300 text-lg">Loading playlist…</p>
                </div>
            </div>
        );
    }

    if (error || !playlist) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-950 via-zinc-900 to-black flex items-center justify-center">
                <div className="text-center text-white px-6">
                    <Music className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-60" />
                    <h1 className="text-2xl font-bold mb-2">Playlist not found</h1>
                    <p className="text-gray-400 mb-6">{error || 'This playlist may be private or no longer available.'}</p>
                    <Link href="/rraasi-music" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full transition-all">
                        <Headphones className="w-5 h-5" /> Browse Music
                    </Link>
                </div>
            </div>
        );
    }

    const playlistImage = playlist.imageUrl ||
        `https://image.pollinations.ai/prompt/${encodeURIComponent((playlist.name || 'spiritual music') + ' divine aesthetic high quality')}?width=600&height=600&nologo=true`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-950 via-zinc-900 to-black text-white">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                {/* Background blur from cover art */}
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-30"
                    style={{ backgroundImage: `url(${playlistImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-zinc-900" />

                <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8 flex flex-col sm:flex-row gap-8 items-start sm:items-end">
                    {/* Cover Art */}
                    <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 shrink-0">
                        <img src={playlistImage} alt={playlist.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Playlist Info */}
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Featured Playlist</span>
                        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">{playlist.name}</h1>
                        {playlist.description && (
                            <p className="text-gray-300 text-sm sm:text-base leading-relaxed line-clamp-3">{playlist.description}</p>
                        )}
                        <p className="text-gray-500 text-sm">{playlist.tracks.length} tracks</p>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-2 flex-wrap">
                            <button
                                onClick={handlePlayAll}
                                className="flex items-center gap-2 px-7 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold rounded-full shadow-lg shadow-amber-500/30 transition-all"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Play All
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full font-semibold text-sm transition-all"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Share'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Track List */}
            <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
                <div className="space-y-1">
                    {playlist.tracks.map((track, index) => {
                        const isActive = currentTrack?.id === track.id;
                        return (
                            <button
                                key={track.id}
                                onClick={() => handlePlayTrack(track, index)}
                                className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all group ${
                                    isActive
                                        ? 'bg-amber-500/20 border border-amber-500/40'
                                        : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {/* Track Number / Play Indicator */}
                                <div className="w-8 text-center shrink-0">
                                    {isActive && isPlaying ? (
                                        <div className="flex gap-0.5 items-end justify-center h-5">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-1 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s`, height: `${8 + i * 4}px` }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <span className={`text-sm font-mono ${isActive ? 'text-amber-400' : 'text-gray-500 group-hover:hidden'}`}>
                                            {index + 1}
                                        </span>
                                    )}
                                    {!isActive && (
                                        <Play className="w-4 h-4 text-white hidden group-hover:block mx-auto fill-current" />
                                    )}
                                </div>

                                {/* Thumbnail */}
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                    {track.imageUrl ? (
                                        <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music className="w-4 h-4 text-gray-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold truncate ${isActive ? 'text-amber-400' : 'text-white'}`}>
                                        {track.title}
                                    </p>
                                    {track.category && (
                                        <p className="text-xs text-gray-500 capitalize truncate">{track.category}</p>
                                    )}
                                </div>

                                {/* Duration */}
                                {track.duration && (
                                    <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                                        {formatDuration(track.duration)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 inset-x-0 pointer-events-none" style={{ height: '96px' }} />
            <div className="border-t border-white/10 text-center py-6 text-gray-600 text-xs">
                Powered by{' '}
                <Link href="/" className="text-amber-400 hover:text-amber-300 font-semibold">RRAASI</Link>
                {' '}· Spiritual Music for the Soul
            </div>
        </div>
    );
}
