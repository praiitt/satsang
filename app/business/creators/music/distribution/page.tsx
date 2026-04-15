
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Loader2, Music, Youtube, Upload, CheckCircle, AlertCircle, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { distributeMusic, disconnectPlatform } from './actions';

interface Track {
    id: string;
    title: string;
    prompt?: string;
    imageUrl?: string;
    audioUrl?: string;
    videoUrl?: string;
    videoStatus?: 'generating' | 'completed' | 'failed';
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
    const [youtubeInfo, setYoutubeInfo] = useState<{ email?: string; name?: string } | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [youtubeQuotaReached, setYoutubeQuotaReached] = useState(false);

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
                if (ytData.connected) {
                    setYoutubeConnected(true);
                    setYoutubeInfo({ email: ytData.userEmail, name: ytData.displayName });
                } else {
                    setYoutubeConnected(false);
                    setYoutubeInfo(null);
                }
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
                    // Filter out tracks that have already been uploaded to YouTube
                    const pendingTracks = data.tracks.filter((t: any) => !t.youtubeUrl && t.youtubeUploadStatus !== 'completed');
                    setTracks(pendingTracks);
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
        const currentOrigin = encodeURIComponent(window.location.origin);
        window.location.href = `/api/auth/${provider}?userId=${user.uid}&appUrl=${currentOrigin}`;
    };

    const handleGenerateVideo = async (track: Track) => {
        if (!user) return;
        
        setTracks(prev => prev.map(t => t.id === track.id ? { ...t, videoStatus: 'generating' } : t));
        const toastId = toast.loading('Starting MP4 video generation...');

        try {
            const res = await fetch('/api/suno/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackId: (track as any).shareId || track.id,
                    sunoId: track.id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start video generation');

            toast.success('Video generation started! It will be ready in a minute.', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to start video generation', { id: toastId });
            setTracks(prev => prev.map(t => t.id === track.id ? { ...t, videoStatus: undefined } : t));
        }
    };

    const handleDisconnect = async (platform: 'youtube' | 'soundcloud') => {
        if (!user) return;
        
        try {
            await disconnectPlatform({ userId: user.uid, platform });
            
            if (platform === 'youtube') {
                setYoutubeConnected(false);
                setYoutubeInfo(null);
            }
            if (platform === 'soundcloud') setSoundcloudConnected(false);
            
            toast.success(`Disconnected from ${platform}`);
        } catch (err: any) {
            console.error('Failed to disconnect:', err);
            toast.error(err.message || `Failed to disconnect from ${platform}`);
        }
    };

    const handleUpload = async (track: Track, platform: 'youtube' | 'soundcloud') => {
        if (!user) return;

        // Optimistic check
        if (platform === 'youtube' && !youtubeConnected) {
            toast.error('Connect YouTube first');
            return;
        }
        
        // Warn if no video for YouTube
        if (platform === 'youtube' && !track.videoUrl) {
            toast.info('No video found. We will generate a basic one with the track image.');
        }

        setUploadingId(track.id);
        const toastId = toast.loading(`Uploading to ${platform}...`);

        try {
            const data = await distributeMusic({
                trackId: track.id,
                shareId: (track as any).shareId || track.id,
                platform,
                userId: user.uid
            });

            if (!data || !data.success) {
                if (data?.error?.includes('QUOTA_EXCEEDED')) {
                    setYoutubeQuotaReached(true);
                    toast.error('YouTube daily upload limit reached.', { id: toastId });
                } else {
                    toast.error(data?.error || 'Upload failed with an unknown error', { id: toastId });
                }
                return;
            }

            toast.success(`Successfully uploaded to ${platform}!`, { id: toastId });

            // Remove from list if uploaded to YouTube, or update state if SoundCloud
            if (platform === 'youtube') {
                setTracks(prev => prev.filter(t => t.id !== track.id));
            } else {
                setTracks(prev => prev.map(t => {
                    if (t.id === track.id) {
                        return { ...t /* add SC details if any */ };
                    }
                    return t;
                }));
            }

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
            {youtubeQuotaReached && (
                <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-6 py-4 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-lg font-medium text-red-200">YouTube Daily Upload Limit Reached</h3>
                        <p className="text-sm text-red-300 mt-1">Brand new YouTube channels are typically limited to ~6 videos per day. Your quota will automatically reset at <strong>Midnight Pacific Time (PT)</strong>.</p>
                    </div>
                </div>
            )}
            
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-8">
                <div>
                    <h1 className="text-4xl font-serif text-white mb-2">Music Distribution</h1>
                    <p className="text-zinc-400">Push your AI-generated tracks to the world.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center">
                            <Button
                                variant={youtubeConnected ? "outline" : "default"}
                                className={youtubeConnected ? "border-green-500/30 text-green-400 bg-green-500/10 rounded-r-none" : "bg-red-600 hover:bg-red-700"}
                                onClick={() => handleConnect('youtube')}
                            >
                                <Youtube className="w-4 h-4 mr-2" />
                                {youtubeConnected ? "Change YouTube Account" : "Connect YouTube"}
                            </Button>
                            {youtubeConnected && (
                                <Button
                                    variant="outline"
                                    className="border-green-500/30 border-l-0 rounded-l-none bg-green-500/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors px-3"
                                    onClick={() => handleDisconnect('youtube')}
                                    title="Disconnect YouTube"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        {youtubeConnected && youtubeInfo?.email && (
                            <div className="text-xs text-zinc-400">
                                Connected as <span className="text-zinc-200">{youtubeInfo.email}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center self-start">
                        <Button
                            variant={soundcloudConnected ? "outline" : "default"}
                            className={soundcloudConnected ? "border-orange-500/30 text-orange-400 bg-orange-500/10 rounded-r-none" : "bg-orange-600 hover:bg-orange-700"}
                            onClick={() => handleConnect('soundcloud')}
                            disabled={soundcloudConnected}
                        >
                            {soundcloudConnected ? <CheckCircle className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                            {soundcloudConnected ? "Connected to SoundCloud" : "Connect SoundCloud"}
                        </Button>
                        {soundcloudConnected && (
                            <Button
                                variant="outline"
                                className="border-orange-500/30 border-l-0 rounded-l-none bg-orange-500/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors px-3"
                                onClick={() => handleDisconnect('soundcloud')}
                                title="Disconnect SoundCloud"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
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
                    {tracks.map(track => {
                        let parsedDate = 'Unknown Date';
                        if (track.createdAt) {
                            try {
                                const ms = typeof track.createdAt === 'object' && 'seconds' in track.createdAt 
                                    ? track.createdAt.seconds * 1000 
                                    : typeof track.createdAt === 'string' 
                                        ? new Date(track.createdAt).getTime()
                                        : track.createdAt;
                                parsedDate = new Date(ms).toLocaleDateString();
                                if (parsedDate === 'Invalid Date') parsedDate = 'Recent';
                            } catch(e) { parsedDate = 'Recent'; }
                        }

                        return (
                        <div key={track.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 hover:border-purple-500/30 transition-colors w-full overflow-hidden">
                            {/* Left Side: Artwork + Info */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full xl:w-auto xl:flex-1 min-w-0">
                                {/* Artwork */}
                                <div className="relative w-24 h-24 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                    {track.imageUrl ? (
                                        <Image src={track.imageUrl} alt={track.title} fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full"><Music className="text-white/20" /></div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white truncate max-w-full" title={track.title || 'Untitled Track'}>{track.title || 'Untitled Track'}</h3>
                                    <p className="text-sm text-zinc-500 truncate mt-1 max-w-full hover:text-zinc-300 transition-colors" title={track.prompt || 'AI Generated Music'}>{track.prompt || 'AI Generated Music'}</p>
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-600 font-mono uppercase">
                                        <span>{parsedDate}</span>
                                        {track.audioUrl && (
                                            <audio controls className="h-8 max-w-[200px] xl:max-w-[240px]" src={track.audioUrl} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Actions */}
                            <div className="flex flex-col sm:flex-row xl:flex-col gap-3 w-full sm:w-auto flex-shrink-0">
                                {track.youtubeUrl ? (
                                    <Button
                                        variant="outline"
                                        className="border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 w-full sm:w-auto xl:w-full min-w-[200px]"
                                        onClick={() => window.open(track.youtubeUrl, '_blank')}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" /> View on YouTube
                                    </Button>
                                ) : (
                                    <div className="flex col-span-2 sm:flex-row xl:flex-col gap-2 w-full">
                                        {!track.videoUrl && (
                                            <Button
                                                variant="outline"
                                                className="border-purple-500/50 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 w-full text-xs py-1 h-10 min-w-[180px]"
                                                disabled={track.videoStatus === 'generating'}
                                                onClick={() => handleGenerateVideo(track)}
                                            >
                                                {track.videoStatus === 'generating' ? (
                                                    <><Loader2 className="animate-spin w-3 h-3 mr-2" /> Creating Video...</>
                                                ) : (
                                                    <><Upload className="w-3 h-3 mr-2" /> Convert to MP4 (Suno)</>
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            className="bg-red-600 hover:bg-red-700 text-white w-full h-10 min-w-[180px]"
                                            disabled={!youtubeConnected || uploadingId === track.id || youtubeQuotaReached}
                                            onClick={() => handleUpload(track, 'youtube')}
                                        >
                                            {uploadingId === track.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Youtube className="w-4 h-4 mr-2" />}
                                            {track.videoUrl ? 'Publish Video to YT' : 'Upload to YouTube'}
                                        </Button>
                                    </div>
                                )}

                                <Button
                                    className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto xl:w-full h-10 min-w-[180px]"
                                    disabled={!soundcloudConnected || uploadingId === track.id}
                                    onClick={() => handleUpload(track, 'soundcloud')}
                                >
                                    {uploadingId === track.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    Upload to SoundCloud
                                </Button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
}
