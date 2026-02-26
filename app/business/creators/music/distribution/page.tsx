
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/livekit/button';
import { Loader2, Music, Youtube, Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Track {
    id: string;
    title: string;
    prompt?: string;
    imageUrl?: string;
    audioUrl?: string;
    createdAt: number;
    youtubeId?: string;
    youtubeUrl?: string;
    youtubeUploadStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function DistributionPage() {
    const { user, loading: authLoading } = useAuth();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [soundcloudConnected, setSoundcloudConnected] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    // Check for success params from OAuth callback
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('connected')) {
                toast.success(`Successfully connected to ${params.get('connected')}`);
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        // Fetch Connection Status
        const checkStatus = async () => {
            try {
                const [ytRes, scRes] = await Promise.all([
                    fetch(`/api/auth/status?userId=${user.uid}&provider=youtube`),
                    fetch(`/api/auth/status?userId=${user.uid}&provider=soundcloud`)
                ]);
                const ytData = await ytRes.json();
                const scData = await scRes.json();
                setYoutubeConnected(ytData.connected);
                setSoundcloudConnected(scData.connected);
            } catch (error) {
                console.error('Failed to check status', error);
            }
        };

        // Fetch Tracks
        const fetchTracks = async () => {
            setLoadingTracks(true);
            try {
                const res = await fetch(`/api/music/user-tracks?userId=${user.uid}&limit=50`);
                const data = await res.json();
                if (data.tracks) {
                    setTracks(data.tracks);
                }
            } catch (error) {
                toast.error('Failed to load tracks');
            } finally {
                setLoadingTracks(false);
            }
        };

        checkStatus();
        fetchTracks();
    }, [user]);

    const handleConnect = (provider: 'youtube' | 'soundcloud') => {
        if (!user) return;
        window.location.href = `/api/auth/${provider}?userId=${user.uid}`;
    };

    const handleUpload = async (track: Track, platform: 'youtube' | 'soundcloud') => {
        if (!user) return;

        // Optimistic check
        if (platform === 'youtube' && !youtubeConnected) {
            toast.error('Connect YouTube first');
            return;
        }
        if (platform === 'soundcloud' && !soundcloudConnected) {
            toast.error('Connect SoundCloud first');
            return;
        }

        setUploadingId(track.id);
        const toastId = toast.loading(`Uploading to ${platform}...`);

        try {
            const res = await fetch('/api/music/distribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackId: track.id,
                    platform,
                    userId: user.uid
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            toast.success(`Successfully uploaded to ${platform}!`, { id: toastId });

            // Update local state to reflect change
            setTracks(prev => prev.map(t => {
                if (t.id === track.id) {
                    return {
                        ...t,
                        youtubeId: data.videoId,
                        youtubeUrl: data.url,
                        youtubeUploadStatus: 'completed'
                    };
                }
                return t;
            }));

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Upload failed', { id: toastId });
        } finally {
            setUploadingId(null);
        }
    };

    if (authLoading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-purple-500" /></div>;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <Music className="w-16 h-16 text-zinc-600" />
                <h2 className="text-2xl font-bold text-white">Sign in to manage distribution</h2>
                <Button onClick={() => window.location.href = '/login'}>Sign In</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 space-y-8 pb-32">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-8">
                <div>
                    <h1 className="text-4xl font-serif text-white mb-2">Music Distribution</h1>
                    <p className="text-zinc-400">Push your AI-generated tracks to the world.</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant={youtubeConnected ? "outline" : "default"}
                        className={youtubeConnected ? "border-green-500/30 text-green-400 bg-green-500/10" : "bg-red-600 hover:bg-red-700"}
                        onClick={() => handleConnect('youtube')}
                        disabled={youtubeConnected}
                    >
                        <Youtube className="w-4 h-4 mr-2" />
                        {youtubeConnected ? "Connected to YouTube" : "Connect YouTube"}
                    </Button>
                    <Button
                        variant={soundcloudConnected ? "outline" : "default"}
                        className={soundcloudConnected ? "border-orange-500/30 text-orange-400 bg-orange-500/10" : "bg-orange-600 hover:bg-orange-700"}
                        onClick={() => handleConnect('soundcloud')}
                        disabled={soundcloudConnected}
                    >
                        {soundcloudConnected ? <CheckCircle className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        {soundcloudConnected ? "Connected to SoundCloud" : "Connect SoundCloud"}
                    </Button>
                </div>
            </header>

            {loadingTracks ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
                </div>
            ) : tracks.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                    <Music className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white">No tracks found</h3>
                    <p className="text-zinc-500 mt-2">Generate some music with our AI agents first!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tracks.map(track => (
                        <div key={track.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6 hover:border-purple-500/30 transition-colors">
                            {/* Artwork */}
                            <div className="relative w-full md:w-24 h-24 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                {track.imageUrl ? (
                                    <Image
                                        src={track.imageUrl}
                                        alt={track.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full"><Music className="text-white/20" /></div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 text-center md:text-left">
                                <h3 className="text-lg font-semibold text-white truncate">{track.title || 'Untitled Track'}</h3>
                                <p className="text-sm text-zinc-500 truncate mt-1">{track.prompt || 'AI Generated Music'}</p>
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-xs text-zinc-600 font-mono uppercase">
                                    <span>{new Date(track.createdAt?.seconds ? track.createdAt.seconds * 1000 : track.createdAt).toLocaleDateString()}</span>
                                    {track.audioUrl && (
                                        <audio controls className="h-6 w-48 opacity-50 hover:opacity-100 transition-opacity" src={track.audioUrl} />
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                {track.youtubeUrl ? (
                                    <Button
                                        variant="outline"
                                        className="border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 w-full"
                                        onClick={() => window.open(track.youtubeUrl, '_blank')}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" /> View on YouTube
                                    </Button>
                                ) : (
                                    <Button
                                        className="bg-red-600 hover:bg-red-700 text-white w-full"
                                        disabled={!youtubeConnected || uploadingId === track.id}
                                        onClick={() => handleUpload(track, 'youtube')}
                                    >
                                        {uploadingId === track.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Youtube className="w-4 h-4 mr-2" />}
                                        Upload to YouTube
                                    </Button>
                                )}

                                <Button
                                    className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                                    disabled={!soundcloudConnected || uploadingId === track.id}
                                    onClick={() => handleUpload(track, 'soundcloud')}
                                >
                                    {uploadingId === track.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    Upload to SC
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
