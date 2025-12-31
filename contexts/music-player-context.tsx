'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export interface MusicTrack {
    id: string;
    title: string;
    audioUrl: string;
    category?: string;
    prompt?: string;
    createdAt?: string;
    duration?: number;
    artist?: string;
    imageUrl?: string;
}

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

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio element
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio();
            audioRef.current.preload = 'metadata'; // Preload metadata only
        }
    }, []);

    // Handle audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            // Avoid division by zero
            const dur = audio.duration || 1;
            setProgress((audio.currentTime / dur) * 100);
        };

        const handleDurationChange = () => {
            setDuration(audio.duration || 0);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            nextTrack(); // Auto-play next track
        };

        const handleError = (e: Event) => {
            console.error("Audio playback error:", e);
            setIsPlaying(false);
        }

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
    }, [queue, currentTrack]); // Re-bind if queue changes to ensure nextTrack has latest queue

    // Sync volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Main Play Logic
    const playTrack = useCallback((track: MusicTrack) => {
        if (!audioRef.current) return;

        const isSameTrack = currentTrack?.id === track.id;

        // If it's the same track and paused, just resume
        if (isSameTrack && audioRef.current.paused) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Play error:", e));
            return;
        }

        // If it's the same track and playing, do nothing (or pause? usually external 'play' means 'start this')
        // But playTrack usually implies "start this new thing". 
        // If called explicitly on the same track, we'll restart or seek? 
        // Let's assume standard behavior: if clicked on card, it usually means play. 

        // Set new track
        setCurrentTrack(track);
        audioRef.current.src = track.audioUrl;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Play error:", e));

        // Allow iOS/Mobile audio context to start
        if (navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist || 'Satsang Music',
                album: track.category || 'Meditation',
                artwork: track.imageUrl ? [{ src: track.imageUrl }] : undefined
            });
        }
    }, [currentTrack]);

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
        if (!audioRef.current || !currentTrack) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Resume error:", e));
        }
    }, [isPlaying, currentTrack]);

    const nextTrack = useCallback(() => {
        if (!currentTrack || queue.length === 0) return;

        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        if (currentIndex === -1 || currentIndex === queue.length - 1) {
            // Loop or stop? Let's stop for now, or loop queue?
            // Let's loop for now if user wants
            setIsPlaying(false);
            return;
        }

        playTrack(queue[currentIndex + 1]);
    }, [currentTrack, queue, playTrack]);

    const prevTrack = useCallback(() => {
        if (!currentTrack || queue.length === 0) return;
        // If played more than 3 seconds, restart current track
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        if (currentIndex > 0) {
            playTrack(queue[currentIndex - 1]);
        }
    }, [currentTrack, queue, playTrack]);

    const seek = useCallback((time: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    const setVolume = useCallback((vol: number) => {
        const v = Math.max(0, Math.min(1, vol));
        setVolumeState(v);
    }, []);

    const setExpanded = useCallback((expanded: boolean) => {
        setIsExpanded(expanded);
    }, []);

    const clearQueue = useCallback(() => {
        setQueue([]);
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
                clearQueue
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
