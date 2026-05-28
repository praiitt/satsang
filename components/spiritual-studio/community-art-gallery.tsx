'use client';

import { useState, useEffect } from 'react';
import { Palette, Music, Sparkles, RefreshCw, Download, Image as ImageIcon, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth } from '@/lib/firebase-client';

interface ArtCard {
    id: string;
    type: 'art';
    imageDataUrl: string;
    intention: string;
    enhancedPrompt?: string;
    createdAt: string;
    isVideo?: boolean;
    isOwner?: boolean;
    isPublic?: boolean;
    trackId?: string; // Add trackId for Suno tracks
}

interface MusicCard {
    id: string;
    type: 'music';
    title: string;
    audioUrl: string;
    imageUrl?: string;
    category?: string;
    prompt?: string;
    isOwner?: boolean;
    isPublic?: boolean;
}

type GalleryCard = ArtCard | MusicCard;

interface CommunityArtGalleryProps {
    musicTracks?: MusicCard[];
    onOpenArtStudio?: () => void;
    fetchUrl?: string;
}

export function CommunityArtGallery({ musicTracks = [], onOpenArtStudio, fetchUrl = '/api/art/community?limit=24' }: CommunityArtGalleryProps) {
    const { isAuthenticated, user } = useAuth();
    const [artItems, setArtItems] = useState<ArtCard[]>([]);
    const [fetchedMusicTracks, setFetchedMusicTracks] = useState<MusicCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'art' | 'music' | 'video'>('all');
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

    useEffect(() => {
        fetchCommunityArt();
    }, []);

    const fetchCommunityArt = async () => {
        try {
            setLoading(true);
            const headers: Record<string, string> = {};
            if (isAuthenticated) {
                const token = await getFirebaseAuth().currentUser?.getIdToken();
                if (token) headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(fetchUrl, { headers });
            if (res.ok) {
                const data = await res.json();
                setArtItems(data.artItems || []);
                if (data.musicTracks) {
                    setFetchedMusicTracks(data.musicTracks);
                }
            }
        } catch (e) {
            console.error('Failed to fetch community art', e);
        } finally {
            setLoading(false);
        }
    };

    const allCards: GalleryCard[] = [
        ...artItems.map(a => ({ ...a, isOwner: a.userId === user?.uid })),
        ...[...musicTracks, ...fetchedMusicTracks].map(t => ({ ...t, type: 'music' as const, isOwner: t.userId === user?.uid, isPublic: t.isPublic }))
    ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const filtered = activeFilter === 'all' ? allCards
        : activeFilter === 'art' ? allCards.filter(c => c.type === 'art' && !c.isVideo)
        : activeFilter === 'video' ? allCards.filter(c => c.type === 'art' && c.isVideo)
        : allCards.filter(c => c.type === 'music');

    const handlePublish = async (card: GalleryCard) => {
        if (!isAuthenticated) return;
        try {
            const token = await getFirebaseAuth().currentUser?.getIdToken();
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            if (card.type === 'art') {
                if (card.trackId) {
                    // It's a Suno art item
                    await fetch('/api/suno/publish', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ trackId: card.trackId, isPublic: true })
                    });
                } else {
                    // It's an Imagen art item
                    await fetch('/api/art/publish', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ artId: card.id, isPublic: true })
                    });
                }
                
                // Update local state
                setArtItems(prev => prev.map(a => a.id === card.id ? { ...a, isPublic: true } : a));
            } else {
                // It's a music track
                await fetch('/api/suno/publish', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ trackId: card.id, isPublic: true })
                });
                
                setFetchedMusicTracks(prev => prev.map(m => m.id === card.id ? { ...m, isPublic: true } : m));
            }
        } catch (e) {
            console.error('Failed to publish', e);
        }
    };

    // Distribute into 3 columns for masonry
    const columns: GalleryCard[][] = [[], [], []];
    filtered.forEach((card, i) => columns[i % 3].push(card));

    return (
        <section className="max-w-7xl mx-auto px-4 mt-16 mb-8">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
                            <Palette className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Community Gallery</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">LIVE</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Divine creations from our spiritual community — art and music manifested through AI</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter Pills */}
                    <div className="flex bg-black/30 dark:bg-black/30 border border-white/10 rounded-full p-1 gap-1 overflow-x-auto scrollbar-hide">
                        {([['all', 'All', Sparkles], ['art', 'Art', ImageIcon], ['music', 'Music', Music], ['video', 'Reels', Video]] as const).map(([val, label, Icon]) => (
                            <button key={val} onClick={() => setActiveFilter(val)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all ${
                                    activeFilter === val
                                        ? 'bg-white text-black shadow'
                                        : 'text-gray-400 hover:text-white'
                                }`}>
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <button onClick={fetchCommunityArt}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Gallery Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`rounded-2xl bg-white/5 animate-pulse ${i % 3 === 0 ? 'aspect-square' : 'aspect-[3/4]'}`} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/2">
                    <Palette className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-400 mb-2">No creations yet</h3>
                    <p className="text-gray-600 mb-6">Be the first to manifest spiritual art in the gallery</p>
                    {onOpenArtStudio && (
                        <button onClick={onOpenArtStudio}
                            className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:scale-105 transition-all shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-4 h-4 inline mr-2" />
                            Create Art
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex gap-4">
                    {columns.map((col, ci) => (
                        <div key={ci} className="flex-1 flex flex-col gap-4">
                            {col.map(card => (
                                <GalleryCardItem
                                    key={card.id}
                                    card={card}
                                    isExpanded={expandedCard === card.id}
                                    isPlaying={playingTrackId === card.id}
                                    onToggleExpand={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                                    onTogglePlay={(id) => setPlayingTrackId(playingTrackId === id ? null : id)}
                                    onTogglePublish={() => handlePublish(card)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* CTA if no art but has music */}
            {!loading && artItems.length === 0 && filtered.length > 0 && onOpenArtStudio && (
                <div className="mt-8 text-center">
                    <button onClick={onOpenArtStudio}
                        className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:scale-105 transition-all shadow-lg shadow-purple-500/20 text-sm">
                        <Palette className="w-4 h-4 inline mr-2" />
                        Be the first to add Art to the Gallery
                    </button>
                </div>
            )}
        </section>
    );
}

function GalleryCardItem({
    card, isExpanded, isPlaying, onToggleExpand, onTogglePlay, onTogglePublish
}: {
    card: GalleryCard;
    isExpanded: boolean;
    isPlaying: boolean;
    onToggleExpand: () => void;
    onTogglePlay: (id: string) => void;
    onTogglePublish: () => void;
}) {
    if (card.type === 'art') {
        const art = card as ArtCard;
        return (
            <motion.div
                layout
                onClick={onToggleExpand}
                className="relative group rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-purple-500/40 transition-all shadow-lg hover:shadow-purple-500/10 bg-black"
            >
                {art.isVideo ? (
                    <video
                        src={art.imageDataUrl}
                        className="w-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                ) : (
                    <img
                        src={art.imageDataUrl}
                        alt={art.intention}
                        className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                    />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
                            {art.isVideo ? 'AI Video' : 'AI Art'}
                        </span>
                    </div>
                    <p className="text-white font-bold text-sm line-clamp-2">{art.intention}</p>
                    <button
                        onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = art.imageDataUrl; a.download = `spiritual-art-${art.id}.png`; a.click(); }}
                        className="mt-3 flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors w-fit"
                    >
                        <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    {art.isOwner && !art.isPublic && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
                            className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
                        >
                            <Sparkles className="w-3 h-3" /> Make Public
                        </button>
                    )}
                </div>
                {/* Art badge */}
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur border border-purple-500/30">
                    <Palette className="w-3 h-3 text-purple-400" />
                </div>
            </motion.div>
        );
    }

    // Music card
    const music = card as MusicCard;
    return (
        <motion.div layout className="relative group rounded-2xl overflow-hidden border border-white/5 hover:border-amber-500/40 transition-all bg-gradient-to-br from-amber-900/20 to-black shadow-lg">
            {music.imageUrl && (
                <img src={music.imageUrl} alt={music.title} className="w-full aspect-square object-cover opacity-60" loading="lazy" />
            )}
            <div className={`${music.imageUrl ? 'absolute inset-0' : ''} flex flex-col justify-end p-4 bg-gradient-to-t from-black/90 to-transparent`}>
                <div className="flex items-center gap-2 mb-1">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Music</span>
                </div>
                <p className="text-white font-bold text-sm line-clamp-1 mb-2">{music.title || 'Untitled Track'}</p>
                {music.audioUrl && (
                    <audio
                        src={music.audioUrl}
                        controls
                        className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity"
                        style={{ accentColor: '#f59e0b' }}
                    />
                )}
                {music.isOwner && !music.isPublic && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
                        className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors relative z-10"
                    >
                        <Sparkles className="w-3 h-3" /> Make Public
                    </button>
                )}
            </div>
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur border border-amber-500/30">
                <Music className="w-3 h-3 text-amber-400" />
            </div>
        </motion.div>
    );
}
