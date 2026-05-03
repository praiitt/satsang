'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Search, Share2, MessageCircle, Copy, Check, Play, Users, Calendar, Globe, Lock, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface AdminTrack {
    id: string;
    title: string;
    userId: string;
    userEmail?: string;
    userPhone?: string;
    userName?: string;
    audioUrl: string;
    imageUrl?: string;
    category?: string;
    isPublic?: boolean;
    createdAt: any;
    shareId?: string;
    status?: string;
    tags?: string[];
    metadata?: any;
    source?: string;
}

const ADMIN_EMAILS = ['praiitt@gmail.com'];
const APP_URL = 'https://rraasi.com';

export default function AdminMusicDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [tracks, setTracks] = useState<AdminTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedTrack, setSelectedTrack] = useState<AdminTrack | null>(null);
    const [shareNote, setShareNote] = useState('');
    const [copied, setCopied] = useState(false);
    const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const shareModalRef = useRef<HTMLDivElement>(null);

    const isAdmin = true; // Temporarily allow any logged-in user to view the admin page just like facebook-leads

    useEffect(() => {
        if (!authLoading && !user) router.push('/');
        // if (!authLoading && user && !isAdmin) router.push('/');
        if (user) fetchTracks();
    }, [user, authLoading, page, search]);

    async function fetchTracks() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (search) params.set('search', search);
            const res = await fetch(`/api/admin/music/tracks?${params}`);
            const data = await res.json();
            setTracks(data.tracks || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function getShareUrl(track: AdminTrack) {
        return `${APP_URL}/track/${track.shareId || track.id}`;
    }

    function getDefaultNote(track: AdminTrack) {
        const name = track.userName || track.userEmail?.split('@')[0] || 'आप';
        return `🙏 *${name}* के लिए विशेष संदेश\n\nआपने RRAASI Satsang में जो आध्यात्मिक यात्रा की, उससे यह सुंदर संगीत बना है। यह आपके लिए खास उपहार है! 🎵\n\n🎧 सुनें: ${getShareUrl(track)}\n\n✨ *${track.title}*\n\nHare Krishna 🙏`;
    }

    function openShareModal(track: AdminTrack) {
        setSelectedTrack(track);
        setShareNote(getDefaultNote(track));
        setCopied(false);
    }

    async function copyLink() {
        if (!selectedTrack) return;
        await navigator.clipboard.writeText(getShareUrl(selectedTrack));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function shareWhatsApp() {
        if (!selectedTrack) return;
        const text = encodeURIComponent(shareNote);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    }

    function shareWhatsAppDirect(phone: string) {
        if (!selectedTrack) return;
        const clean = phone.replace(/\D/g, '');
        const text = encodeURIComponent(shareNote);
        window.open(`https://wa.me/${clean}?text=${text}`, '_blank');
    }

    function togglePlay(track: AdminTrack) {
        if (playingId === track.id) {
            audioEl?.pause();
            setPlayingId(null);
            return;
        }
        audioEl?.pause();
        const audio = new Audio(track.audioUrl);
        audio.play();
        audio.onended = () => setPlayingId(null);
        setAudioEl(audio);
        setPlayingId(track.id);
    }

    function formatDate(val: any) {
        if (!val) return '—';
        try {
            const d = val?.toDate ? val.toDate() : new Date(val);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return '—'; }
    }

    if (authLoading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!isAdmin) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="text-center">
                <div className="text-5xl mb-4">🔐</div>
                <p className="text-xl">Access Denied</p>
            </div>
        </div>
    );

    const totalPages = Math.ceil(total / 20);

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl">
                            <Music className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Music Admin Dashboard</h1>
                            <p className="text-xs text-zinc-400">{total} total tracks across all users</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2 flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search tracks, users..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="bg-transparent text-sm text-white placeholder-zinc-500 outline-none w-full"
                        />
                        {search && (
                            <button onClick={() => { setSearch(''); setPage(1); }}>
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tracks', value: total, icon: Music, color: 'amber' },
                    { label: 'Showing', value: tracks.length, icon: Users, color: 'blue' },
                    { label: 'Page', value: `${page} / ${totalPages || 1}`, icon: Calendar, color: 'purple' },
                    { label: 'Public', value: tracks.filter(t => t.isPublic).length, icon: Globe, color: 'green' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-${color}-500/10`}>
                            <Icon className={`w-5 h-5 text-${color}-400`} />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500">{label}</p>
                            <p className="text-xl font-bold text-white">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tracks Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-44 bg-zinc-800/50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : tracks.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500">
                        <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No tracks found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tracks.map(track => (
                            <div key={track.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all group">
                                {/* Artwork */}
                                <div className="relative h-36 bg-gradient-to-br from-amber-900/30 to-purple-900/30">
                                    {track.imageUrl ? (
                                        <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music className="w-10 h-10 text-amber-500/40" />
                                        </div>
                                    )}
                                    {/* Overlay badges */}
                                    <div className="absolute top-2 left-2 flex gap-1.5">
                                        <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase">
                                            {track.category || 'Music'}
                                        </span>
                                        {track.source === 'private_satsang' && (
                                            <span className="bg-amber-500/80 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                                🕉️ Satsang
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        {track.isPublic
                                            ? <Globe className="w-4 h-4 text-green-400" />
                                            : <Lock className="w-4 h-4 text-zinc-400" />
                                        }
                                    </div>
                                    {/* Play button */}
                                    {track.audioUrl && (
                                        <button
                                            onClick={() => togglePlay(track)}
                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                                {playingId === track.id
                                                    ? <div className="flex gap-0.5 items-end h-5"><span className="w-1 bg-white h-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1 bg-white h-3 animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1 bg-white h-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
                                                    : <Play className="w-5 h-5 text-white ml-0.5 fill-current" />
                                                }
                                            </div>
                                        </button>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1">{track.title}</h3>

                                    {/* User Info */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <Users className="w-3 h-3 text-amber-400" />
                                        </div>
                                        <div className="min-w-0">
                                            {track.userName && <p className="text-xs font-medium text-zinc-300 truncate">{track.userName}</p>}
                                            <p className="text-[11px] text-zinc-500 truncate">{track.userEmail || track.userPhone || track.userId}</p>
                                        </div>
                                        <span className="ml-auto text-[10px] text-zinc-600 shrink-0">{formatDate(track.createdAt)}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openShareModal(track)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-all border border-amber-500/20"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            Share
                                        </button>
                                        {(track.userPhone || track.userEmail) && (
                                            <button
                                                onClick={() => {
                                                    openShareModal(track);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-semibold transition-all border border-green-500/20"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                WhatsApp
                                            </button>
                                        )}
                                        <a
                                            href={getShareUrl(track)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-all border border-zinc-700"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 disabled:opacity-30 hover:bg-zinc-700 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-zinc-400">Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 disabled:opacity-30 hover:bg-zinc-700 transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Share Modal */}
            {selectedTrack && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div ref={shareModalRef} className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                {selectedTrack.imageUrl && (
                                    <img src={selectedTrack.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                )}
                                <div>
                                    <p className="font-semibold text-white text-sm line-clamp-1">{selectedTrack.title}</p>
                                    <p className="text-xs text-zinc-400">{selectedTrack.userName || selectedTrack.userEmail || 'User'}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTrack(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Share Link */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 mb-2 block">🔗 Share Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 truncate border border-zinc-700">
                                        {getShareUrl(selectedTrack)}
                                    </div>
                                    <button
                                        onClick={copyLink}
                                        className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* WhatsApp Note Editor */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 mb-2 block">✍️ Personal Note (editable)</label>
                                <textarea
                                    value={shareNote}
                                    onChange={e => setShareNote(e.target.value)}
                                    rows={8}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white resize-none outline-none focus:border-amber-500/50 transition-colors"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {/* WhatsApp generic */}
                                <button
                                    onClick={shareWhatsApp}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all shadow-lg shadow-green-900/30"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Share on WhatsApp
                                </button>

                                {/* Direct to user's phone if available */}
                                {selectedTrack.userPhone && (
                                    <button
                                        onClick={() => shareWhatsAppDirect(selectedTrack.userPhone!)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-lg"
                                        title={`Send directly to ${selectedTrack.userPhone}`}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Send to User
                                    </button>
                                )}
                            </div>

                            {selectedTrack.userPhone && (
                                <p className="text-xs text-center text-zinc-500">
                                    User's phone: <span className="text-zinc-300">{selectedTrack.userPhone}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
