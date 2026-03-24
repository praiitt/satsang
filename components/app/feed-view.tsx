'use client';

import { useState, useEffect, useRef } from 'react';
import { getFeedRecordings, type Recording } from '@/lib/auth-api';
import { ALL_GURUS } from '@/lib/gurus';
import { Play, Pause, ChevronDown, User, Heart, Share2, Compass, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/livekit/button';
import Link from 'next/link';
import { TRADITION_DETAILS } from '@/lib/gurus';

export function FeedView() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoading(true);
        getFeedRecordings(20)
            .then(setRecordings)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Handle scroll snapping detection
    const handleScroll = () => {
        if (!containerRef.current) return;
        const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };

    const scrollToNext = (currentIdx: number) => {
        if (!containerRef.current) return;
        const nextIdx = currentIdx + 1;
        if (nextIdx >= recordings.length) return; // Already at last item
        containerRef.current.scrollTo({
            top: nextIdx * window.innerHeight,
            behavior: 'smooth',
        });
        setActiveIndex(nextIdx);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 z-50">
                <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-white/50 animate-pulse text-sm font-medium tracking-widest uppercase">Initializing RRaaSi Feed...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 overflow-hidden font-sans">
            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
                <Link href="/">
                    <button className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-2xl">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                </Link>
                <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-orange-500 animate-pulse" />
                    <span className="text-white font-bold tracking-tighter text-xl uppercase italic">RRaaSi FEED</span>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/50">
                    <User className="w-5 h-5" />
                </div>
            </div>

            {/* Scroll Container */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollSnapType: 'y mandatory' }}
            >
                {recordings.map((rec, idx) => (
                    <FeedItem 
                        key={rec.id} 
                        recording={rec} 
                        isActive={idx === activeIndex}
                        onVideoEnded={() => scrollToNext(idx)}
                    />
                ))}
            </div>

            {/* Scroll Indicator */}
            {activeIndex === 0 && recordings.length > 1 && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 animate-bounce pointer-events-none opacity-50">
                    <span className="text-[10px] text-white font-bold uppercase tracking-[0.2em]">Swipe for more</span>
                    <ChevronDown className="w-6 h-6 text-white" />
                </div>
            )}
        </div>
    );
}

// Maps tradition category to a CSS color for the aura — must be inline since Tailwind JIT can't compile dynamic class strings
const TRADITION_AURA_COLOR: Record<string, string> = {
    hinduism:   'rgba(234,88,12,0.6)',    // orange
    buddhism:   'rgba(217,119,6,0.6)',    // amber
    jainism:    'rgba(16,185,129,0.6)',   // emerald
    sikhism:    'rgba(217,119,6,0.6)',    // amber
    christianity:'rgba(99,102,241,0.6)', // indigo
    islam:      'rgba(20,184,166,0.6)',   // teal
    judaism:    'rgba(6,182,212,0.6)',    // cyan
    taoism:     'rgba(20,184,166,0.6)',   // teal
    universal:  'rgba(168,85,247,0.6)',   // purple
};

function AuraBackground({ guru, tradition }: { guru: any, tradition: any }) {
    const color = TRADITION_AURA_COLOR[guru?.category ?? ''] ?? 'rgba(168,85,247,0.6)';
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
            {/* Pulsing rings */}
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="absolute rounded-full animate-ping"
                    style={{
                        width: `${160 + i * 80}px`,
                        height: `${160 + i * 80}px`,
                        background: color.replace('0.6', '0.12'),
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: '3s',
                    }}
                />
            ))}
            {/* Breathing background glow */}
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse at center, ${color.replace('0.6','0.25')} 0%, transparent 70%)`,
                    animation: 'breathe 4s ease-in-out infinite',
                }}
            />
            {/* Center: guru photo or emoji */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div
                    className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                        border: `2px solid ${color.replace('0.6','0.5')}`,
                        boxShadow: `0 0 40px ${color.replace('0.6','0.4')}`,
                        background: 'rgba(0,0,0,0.5)',
                    }}
                >
                    {guru?.image
                        ? <img src={guru.image} alt={guru?.name} className="w-full h-full object-cover" />
                        : <span className="text-6xl">{tradition?.emoji ?? '🕉️'}</span>
                    }
                </div>
                <p className="text-white/80 text-sm font-light tracking-[0.3em] uppercase drop-shadow-md">
                    {guru?.name || 'Spiritual Wisdom'}
                </p>
                <p className="text-white/40 text-xs tracking-widest uppercase animate-pulse">
                    Audio Satsang
                </p>
            </div>
            <style>{`@keyframes breathe { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }`}</style>
        </div>
    );
}

function FeedItem({ recording, isActive, onVideoEnded }: { recording: Recording, isActive: boolean, onVideoEnded?: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(isActive);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasVideo, setHasVideo] = useState(false); // true only if video track has actual frames
    
    // Find guru details
    const guruId = recording.guruId || (recording.roomName?.split('_')[1]);
    const guru = ALL_GURUS.find(g => g.id === guruId);
    const tradition = TRADITION_DETAILS[guru?.category || 'universal'] || TRADITION_DETAILS['universal'];

    // Robust URL resolution (Legacy fallback)
    const videoUrl = recording.publicUrl || (recording.filePath ? `https://storage.googleapis.com/rraasi-agent-recordings/${recording.filePath}` : null);

    useEffect(() => {
        if (isActive && videoRef.current && videoUrl) {
            setError(null);
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch((error) => {
                        console.log("Feed autoplay blocked:", error);
                        setIsPlaying(false);
                    });
            }
        } else {
            videoRef.current?.pause();
            setIsPlaying(false);
        }
    }, [isActive, videoUrl]);

    const togglePlay = () => {
        if (!videoUrl) return;
        if (videoRef.current?.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current?.pause();
            setIsPlaying(false);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    // Calculate display duration
    const durationSec = Math.round(recording.duration ? recording.duration / 1e9 : 0);
    const durationMin = Math.floor(durationSec / 60);
    const durationRem = durationSec % 60;

    // A private satsang egress is an audio-only room that produces a video file with a black frame. 
    // We treat it as an aura-only visual.
    const isVisualLess = recording.intention === 'private_satsang' || !hasVideo;

    return (
        <div className="h-full w-full snap-start relative flex flex-col items-center justify-center bg-zinc-900 group">
            {/* Immersive Background Blur */}
            <div className={`absolute inset-0 bg-gradient-to-br ${tradition.theme} opacity-30 -z-10`} />
            
            {/* Visual Content (Video/Audio) */}
            <div className="relative w-full h-full flex items-center justify-center">
                {videoUrl ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            muted={isMuted}
                            playsInline
                            crossOrigin="anonymous"
                            // Hide the element completely if it's visually just a black frame
                            className={`w-full h-full object-cover sm:object-contain ${isVisualLess ? 'opacity-0' : 'opacity-100'}`}
                            onClick={togglePlay}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => onVideoEnded?.()}
                            onLoadedMetadata={(e) => {
                                // videoHeight > 0 means there is a real video track framing
                                setHasVideo(e.currentTarget.videoHeight > 0);
                            }}
                            onError={(e) => {
                                const video = e.currentTarget;
                                const msg = video.error?.code === 4 ? "CORS or Access Denied" : "Playback Error";
                                console.error(`[Feed] Video Error: ${msg}`, video.error);
                                setError(`${msg} (Code ${video.error?.code})`);
                                setIsPlaying(false);
                            }}
                        />
                        {/* Show aura when video is visually empty (like private satsangs) */}
                        {isVisualLess && !error && <AuraBackground guru={guru} tradition={tradition} />}
                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-8 text-center z-20">
                                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4">
                                    <Play className="w-8 h-8 text-red-500 opacity-50" />
                                </div>
                                <h3 className="text-white font-bold text-xl mb-2">Unavailable</h3>
                                <p className="text-white/60 text-sm max-w-xs">{error}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <AuraBackground guru={guru} tradition={tradition} />
                )}

                {/* Play/Pause Large Overlay */}
                {!isPlaying && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] cursor-pointer"
                        onClick={togglePlay}
                    >
                        <div className="w-20 h-20 rounded-full bg-white/20 border border-white/30 flex items-center justify-center animate-in zoom-in duration-300">
                            <Play className="w-10 h-10 text-white fill-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay Info (Bottom) */}
            <div className="absolute bottom-0 left-0 w-full p-8 pt-24 bg-gradient-to-t from-black via-black/60 to-transparent z-30">
                <div className="flex flex-col gap-4 max-w-lg">
                    {/* Badge */}
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-bold text-orange-400 uppercase tracking-widest backdrop-blur-md">
                            {recording.intention === 'private_satsang' ? 'Private Satsang' : 'Spiritual Insight'}
                        </div>
                    </div>

                    {/* Guru Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-800">
                           {guru?.image ? (
                               <img src={guru.image} alt={guru.name} className="w-full h-full object-cover" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-xl">{tradition.emoji}</div>
                           )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white drop-shadow-md">
                                {guru?.name || 'Spiritual Master'}
                            </h2>
                            <p className="text-white/60 text-sm font-medium">
                                {tradition.title} • {(() => {
                                    const rawDate = recording.startedAt || recording.createdAt;
                                    const date = rawDate ? new Date(
                                        typeof rawDate === 'string' ? rawDate :
                                        (typeof rawDate === 'object' && '_seconds' in rawDate) ? (rawDate._seconds * 1000) :
                                        rawDate
                                    ) : new Date();
                                    return format(date, 'MMM d, yyyy');
                                })()}
                            </p>
                        </div>
                    </div>

                    {/* Metadata */}
                    <p className="text-white/80 text-lg leading-relaxed line-clamp-2 font-medium drop-shadow-sm italic">
                        "Experience the presence of {guru?.name} in this localized reflection of divine wisdom."
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                        <Link href={`/${guru?.category}/${guruId}`} className="flex-1">
                            <Button className="w-full h-12 rounded-2xl bg-white text-black font-bold hover:bg-white/90 shadow-xl border-0">
                                🧘 Connect with {guruId === 'shiva' ? 'Mahadev' : 'Guru'}
                            </Button>
                        </Link>
                        <Button variant="outline" className="h-12 w-12 rounded-2xl border-white/20 bg-white/10 backdrop-blur-md">
                            <Share2 className="w-5 h-5 text-white" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Side Actions (Like, Share counts etc) */}
            <div className="absolute right-6 bottom-32 flex flex-col items-center gap-6 z-40">
                <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        <Heart className="w-6 h-6 text-white group-hover/btn:text-red-500 fill-transparent group-hover/btn:fill-red-500 transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold text-white/70 uppercase">Like</span>
                </div>
                <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white/70 uppercase">Share</span>
                </div>
                <div className="mt-4 w-1 flex flex-col h-32 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="w-full bg-orange-500 transition-all duration-300 rounded-full" 
                        style={{ height: isActive ? '100%' : '0%' }}
                    />
                </div>
            </div>
        </div>
    );
}
