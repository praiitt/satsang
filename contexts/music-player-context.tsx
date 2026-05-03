'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export interface MusicTrack {
    id: string;
    title: string;
    audioUrl: string;
    category?: string;
    prompt?: string;
    description?: string;
    createdAt?: string;
    duration?: number;
    artist?: string;
    imageUrl?: string;
    story?: string;
    lyrics?: string;
    healingBenefits?: string[];
    tags?: string[];
    metadata?: any;
}

export type RepeatMode = 'off' | 'one' | 'all';

interface MusicPlayerContextType {
    // State
    currentTrack: MusicTrack | null;
    isPlaying: boolean;
    queue: MusicTrack[];
    progress: number; // 0-100
    currentTime: number;
    duration: number;
    isExpanded: boolean; // For mobile full-screen view
    volume: number;
    repeatMode: RepeatMode;

    // Actions
    playTrack: (track: MusicTrack) => void;
    playPlaylist: (tracks: MusicTrack[], startIndex?: number) => void;
    addToQueue: (track: MusicTrack) => void;
    removeFromQueue: (trackId: string) => void;
    togglePlayPause: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    setExpanded: (expanded: boolean) => void;
    clearQueue: () => void;
    closePlayer: () => void;
    cycleRepeatMode: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState<MusicTrack[]>([]);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [volume, setVolumeState] = useState(1);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Keep mutable refs so event handlers always see latest values without re-binding
    const queueRef = useRef(queue);
    const currentTrackRef = useRef(currentTrack);
    const repeatModeRef = useRef(repeatMode);

    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

    // Initialize audio element
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio();
            audioRef.current.preload = 'metadata';
        }
    }, []);

    // Handle audio events — only bind once
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            const dur = audio.duration || 1;
            setProgress((audio.currentTime / dur) * 100);
        };

        const handleDurationChange = () => {
            setDuration(audio.duration || 0);
        };

        const handleEnded = () => {
            const mode = repeatModeRef.current;
            const track = currentTrackRef.current;
            const q = queueRef.current;

            if (mode === 'one') {
                // Repeat same track
                audio.currentTime = 0;
                audio.play().then(() => setIsPlaying(true)).catch(console.error);
                return;
            }

            if (!track || q.length === 0) {
                setIsPlaying(false);
                return;
            }

            const idx = q.findIndex(t => t.id === track.id);

            if (mode === 'all') {
                // Go to next, or loop back to first
                const nextIdx = (idx + 1) % q.length;
                const nextTrack = q[nextIdx];
                setCurrentTrack(nextTrack);
                audio.src = nextTrack.audioUrl;
                audio.load();
                audio.play().then(() => setIsPlaying(true)).catch(console.error);
            } else {
                // mode === 'off'
                if (idx === -1 || idx === q.length - 1) {
                    setIsPlaying(false);
                } else {
                    const nextTrack = q[idx + 1];
                    setCurrentTrack(nextTrack);
                    audio.src = nextTrack.audioUrl;
                    audio.load();
                    audio.play().then(() => setIsPlaying(true)).catch(console.error);
                }
            }
        };

        const handleError = (e: Event) => {
            console.error('Audio playback error:', e);
            setIsPlaying(false);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, []); // Bind only once — use refs for latest values

    // Sync volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Main Play Logic
    const playTrack = useCallback((track: MusicTrack) => {
        if (!audioRef.current) return;

        const isSameTrack = currentTrackRef.current?.id === track.id;

        if (isSameTrack && audioRef.current.paused) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('Play error:', e));
            return;
        }

        setCurrentTrack(track);
        audioRef.current.src = track.audioUrl;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('Play error:', e));

        if (navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist || 'Satsang Music',
                album: track.category || 'Meditation',
                artwork: track.imageUrl ? [{ src: track.imageUrl }] : undefined
            });
        }
    }, []);

    const playPlaylist = useCallback((tracks: MusicTrack[], startIndex = 0) => {
        if (tracks.length === 0) return;
        setQueue(tracks);
        playTrack(tracks[startIndex]);
    }, [playTrack]);

    const addToQueue = useCallback((track: MusicTrack) => {
        setQueue(prev => [...prev, track]);
    }, []);

    const removeFromQueue = useCallback((trackId: string) => {
        setQueue(prev => prev.filter(t => t.id !== trackId));
    }, []);

    const togglePlayPause = useCallback(() => {
        if (!audioRef.current || !currentTrackRef.current) return;
        if (audioRef.current.paused) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('Resume error:', e));
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    const nextTrack = useCallback(() => {
        const track = currentTrackRef.current;
        const q = queueRef.current;
        const audio = audioRef.current;
        if (!track || q.length === 0 || !audio) return;

        const idx = q.findIndex(t => t.id === track.id);
        const mode = repeatModeRef.current;

        if (mode === 'one') {
            // Skip repeat-one when user explicitly presses next
            const nextIdx = idx === q.length - 1 ? 0 : idx + 1;
            const next = q[nextIdx];
            setCurrentTrack(next);
            audio.src = next.audioUrl;
            audio.load();
            audio.play().then(() => setIsPlaying(true)).catch(console.error);
            return;
        }

        if (idx === q.length - 1) {
            if (mode === 'all') {
                const next = q[0];
                setCurrentTrack(next);
                audio.src = next.audioUrl;
                audio.load();
                audio.play().then(() => setIsPlaying(true)).catch(console.error);
            } else {
                setIsPlaying(false);
            }
            return;
        }

        const next = q[idx + 1];
        setCurrentTrack(next);
        audio.src = next.audioUrl;
        audio.load();
        audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }, []);

    const prevTrack = useCallback(() => {
        const track = currentTrackRef.current;
        const q = queueRef.current;
        const audio = audioRef.current;
        if (!track || !audio) return;

        // If played more than 3 seconds, restart current track
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        const idx = q.findIndex(t => t.id === track.id);
        if (idx > 0) {
            const prev = q[idx - 1];
            setCurrentTrack(prev);
            audio.src = prev.audioUrl;
            audio.load();
            audio.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    }, []);

    const seek = useCallback((time: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    const setVolume = useCallback((vol: number) => {
        setVolumeState(Math.max(0, Math.min(1, vol)));
    }, []);

    const setExpanded = useCallback((expanded: boolean) => {
        setIsExpanded(expanded);
    }, []);

    const clearQueue = useCallback(() => {
        setQueue([]);
    }, []);

    const closePlayer = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTrack(null);
    }, []);

    const cycleRepeatMode = useCallback(() => {
        setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    }, []);

    return (
        <MusicPlayerContext.Provider
            value={{
                currentTrack,
                isPlaying,
                queue,
                progress,
                currentTime,
                duration,
                isExpanded,
                volume,
                repeatMode,
                playTrack,
                playPlaylist,
                addToQueue,
                removeFromQueue,
                togglePlayPause,
                nextTrack,
                prevTrack,
                seek,
                setVolume,
                setExpanded,
                clearQueue,
                closePlayer,
                cycleRepeatMode,
            }}
        >
            {children}
        </MusicPlayerContext.Provider>
    );
}

export function useMusicPlayer() {
    const context = useContext(MusicPlayerContext);
    if (context === undefined) {
        throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
    }
    return context;
}
