'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Coins, ImageIcon, Play, Pause, Volume2, VolumeX, Package, Maximize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { toast } from 'sonner';

interface AiArtGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    trackTitle: string;
    trackId: string;
    trackOwnerId?: string;
    images: string[];
    videoUrl?: string;
    prompt?: string;
    onShowBuyCoins?: () => void;
}

export function AiArtGallery({
    isOpen,
    onClose,
    trackTitle,
    trackId,
    trackOwnerId,
    images,
    videoUrl,
    prompt,
    onShowBuyCoins,
}: AiArtGalleryProps) {
    const { user } = useAuth();
    const isOwner = user?.uid === trackOwnerId;

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoMuted, setVideoMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                if (selectedIndex !== null) {
                    setSelectedIndex(null);
                } else {
                    onClose();
                }
            }
            if (selectedIndex !== null) {
                if (e.key === 'ArrowRight') navigateImage(1);
                if (e.key === 'ArrowLeft') navigateImage(-1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, images.length]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setSelectedIndex(null);
            setVideoPlaying(false);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const navigateImage = useCallback((direction: number) => {
        if (selectedIndex === null) return;
        const newIndex = selectedIndex + direction;
        if (newIndex >= 0 && newIndex < images.length) {
            setSelectedIndex(newIndex);
        }
    }, [selectedIndex, images.length]);

    const handleDownload = async (contentUrl: string, type: 'image' | 'video' | 'pack') => {
        if (downloading) return;
        setDownloading(type === 'pack' ? 'pack' : contentUrl);

        try {
            const auth = getFirebaseAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                toast.error('Please sign in to download');
                return;
            }

            const res = await fetch('/api/rraasi-music/download-art', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ contentUrl, trackId, type }),
            });

            if (res.status === 402) {
                // Insufficient coins
                toast.error('Not enough coins!');
                onShowBuyCoins?.();
                return;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Download failed');
                return;
            }

            // For pack, we get JSON with URLs; for single items, we get the file blob
            if (type === 'pack') {
                const data = await res.json();
                // Download each URL sequentially
                for (let i = 0; i < (data.urls || []).length; i++) {
                    const url = data.urls[i];
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${trackTitle.replace(/[^a-z0-9]/gi, '_')}_${i + 1}.${url.includes('.mp4') ? 'mp4' : 'jpg'}`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    // Small delay between downloads
                    await new Promise(r => setTimeout(r, 300));
                }
                toast.success(`🎨 Full art pack downloaded!${!isOwner ? ' Coins deducted.' : ''}`);
            } else {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                const ext = type === 'video' ? 'mp4' : 'jpg';
                const safeTitle = (trackTitle || 'art').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                a.download = `${safeTitle}_${type === 'video' ? 'video' : `scene_${(selectedIndex ?? 0) + 1}`}.${ext}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success(`${type === 'video' ? '🎬 Video' : '🖼️ Image'} downloaded!${!isOwner ? ' Coins deducted.' : ''}`);
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Download failed. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const toggleVideoPlay = () => {
        if (!videoRef.current) return;
        if (videoPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setVideoPlaying(!videoPlaying);
    };

    const toggleVideoMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !videoMuted;
        setVideoMuted(!videoMuted);
    };

    if (!isOpen) return null;

    const totalItems = images.length + (videoUrl ? 1 : 0);
    const costLabel = isOwner ? 'Free' : '';

    return (
        <>
            {/* Main Gallery Modal */}
            <div
                ref={modalRef}
                className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl"
                onClick={(e) => { if (e.target === modalRef.current) onClose(); }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-bold text-amber-300">{totalItems} AI Art</span>
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-white truncate">{trackTitle}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Download All Pack */}
                        <button
                            onClick={() => handleDownload('', 'pack')}
                            disabled={downloading === 'pack'}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400",
                                "active:scale-95 shadow-lg shadow-amber-500/25",
                                downloading === 'pack' && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {downloading === 'pack' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Package className="w-3.5 h-3.5" />
                            )}
                            Download All
                            {!isOwner && <span className="flex items-center gap-0.5 ml-1 bg-black/20 px-1.5 py-0.5 rounded-full"><Coins className="w-3 h-3" /> 40</span>}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Prompt Context */}
                {prompt && (
                    <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-white/5">
                        <p className="text-xs text-white/60 line-clamp-1 italic">
                            ✨ &quot;{prompt}&quot;
                        </p>
                    </div>
                )}

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4">
                    {/* Video Hero */}
                    {videoUrl && (
                        <div className="mb-4">
                            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl group/video max-w-2xl mx-auto">
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    muted={videoMuted}
                                    loop
                                    playsInline
                                    preload="metadata"
                                    className="w-full aspect-video object-cover"
                                    onClick={toggleVideoPlay}
                                    onPlay={() => setVideoPlaying(true)}
                                    onPause={() => setVideoPlaying(false)}
                                />
                                {/* Video controls overlay */}
                                <div className={cn(
                                    "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity",
                                    videoPlaying ? "opacity-0 group-hover/video:opacity-100" : "opacity-100"
                                )}>
                                    <button
                                        onClick={toggleVideoPlay}
                                        className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110 active:scale-95"
                                    >
                                        {videoPlaying ? (
                                            <Pause className="w-6 h-6 text-white fill-white" />
                                        ) : (
                                            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                                        )}
                                    </button>
                                </div>
                                {/* Bottom controls */}
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={toggleVideoMute}
                                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors border border-white/10"
                                    >
                                        {videoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                                    </button>
                                    <button
                                        onClick={() => handleDownload(videoUrl, 'video')}
                                        disabled={downloading === videoUrl}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
                                            "bg-blue-500/80 hover:bg-blue-500 text-white backdrop-blur-md border border-blue-400/30 transition-all",
                                            downloading === videoUrl && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {downloading === videoUrl ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Download className="w-3 h-3" />
                                        )}
                                        {isOwner ? 'Download' : '25 🪙'}
                                    </button>
                                </div>
                                {/* Label */}
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                                    <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Music Video</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section Label */}
                    {images.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <ImageIcon className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">AI Generated Scenes</span>
                            <span className="text-[10px] text-white/40">({images.length} images)</span>
                        </div>
                    )}

                    {/* Image Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                        {images.map((imgUrl, index) => (
                            <div
                                key={index}
                                className="group/img relative rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer aspect-square hover:border-amber-500/40 transition-all hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5"
                                onClick={() => setSelectedIndex(index)}
                            >
                                <img
                                    src={imgUrl}
                                    alt={`AI Art Scene ${index + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                    loading="lazy"
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                                    <span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                                        Scene {index + 1}
                                    </span>
                                    <Maximize2 className="w-4 h-4 text-white/80" />
                                </div>
                                {/* Watermark for non-owners */}
                                {!isOwner && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                        <span className="text-white font-black text-lg tracking-[0.3em] rotate-[-30deg] select-none">RRAASI</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Full-screen Image Preview */}
            {selectedIndex !== null && (
                <div
                    className="fixed inset-0 z-[110] bg-black/98 backdrop-blur-xl flex flex-col"
                    onClick={() => setSelectedIndex(null)}
                >
                    {/* Preview Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-black/40" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm font-bold text-white/80">
                            Scene {selectedIndex + 1} of {images.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(images[selectedIndex], 'image');
                                }}
                                disabled={downloading === images[selectedIndex]}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400",
                                    "active:scale-95 shadow-lg",
                                    downloading === images[selectedIndex] && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {downloading === images[selectedIndex] ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                {isOwner ? 'Download Free' : 'Download · 5 🪙'}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Image */}
                    <div className="flex-1 flex items-center justify-center relative px-12" onClick={(e) => e.stopPropagation()}>
                        {/* Left arrow */}
                        {selectedIndex > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigateImage(-1); }}
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        <img
                            src={images[selectedIndex]}
                            alt={`AI Art Scene ${selectedIndex + 1}`}
                            className="max-h-[80vh] max-w-full rounded-lg shadow-2xl object-contain animate-in fade-in zoom-in-95 duration-200"
                        />

                        {/* Right arrow */}
                        {selectedIndex < images.length - 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigateImage(1); }}
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}

                        {/* Watermark for non-owners */}
                        {!isOwner && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                                <span className="text-white font-black text-4xl tracking-[0.5em] rotate-[-30deg] select-none">RRAASI</span>
                            </div>
                        )}
                    </div>

                    {/* Thumbnail strip */}
                    <div className="flex items-center justify-center gap-1.5 px-4 py-3 bg-black/40 overflow-x-auto">
                        {images.map((imgUrl, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setSelectedIndex(i); }}
                                className={cn(
                                    "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                                    i === selectedIndex ? "border-amber-500 scale-110 shadow-lg shadow-amber-500/30" : "border-white/10 opacity-50 hover:opacity-80"
                                )}
                            >
                                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
