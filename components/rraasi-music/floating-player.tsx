'use client';

import React, { useEffect, useState } from 'react';
import { useMusicPlayer, MusicTrack } from '@/contexts/music-player-context';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize2,
    Minimize2,
    X,
    ListMusic,
    Music
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/livekit/button';

export function FloatingPlayer() {
    const {
        currentTrack,
        isPlaying,
        togglePlayPause,
        nextTrack,
        prevTrack,
        progress,
        currentTime,
        duration,
        seek,
        isExpanded,
        setExpanded,
        volume,
        setVolume
    } = useMusicPlayer();

    const [isHovered, setIsHovered] = useState(false);

    // If no track is loaded, don't render anything
    if (!currentTrack) return null;

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = (parseFloat(e.target.value) / 100) * duration;
        seek(time);
    };

    // Full Screen / Expanded Player Overlay
    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => setExpanded(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <Minimize2 className="w-6 h-6" />
                    </button>
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Now Playing</span>
                    <button className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ListMusic className="w-6 h-6" />
                    </button>
                </div>

                {/* Artwork */}
                <div className="flex-1 flex items-center justify-center mb-8">
                    <div className="relative w-64 h-64 md:w-80 md:h-80 shadow-2xl rounded-2xl overflow-hidden aspect-square mx-auto">
                        {currentTrack.imageUrl ? (
                            <img
                                src={currentTrack.imageUrl}
                                alt={currentTrack.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                                <Music className="w-24 h-24 text-white opacity-50" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Track Info */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{currentTrack.title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">{currentTrack.artist || 'Rraasi Music'}</p>
                </div>

                {/* Seek Bar */}
                <div className="mb-8 w-full max-w-2xl mx-auto">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress || 0}
                        onChange={handleSeek}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 mb-12">
                    <button onClick={prevTrack} className="p-4 text-gray-900 dark:text-white hover:opacity-75 transition-opacity">
                        <SkipBack className="w-8 h-8" />
                    </button>

                    <button
                        onClick={togglePlayPause}
                        className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                        {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 ml-1 fill-current" />}
                    </button>

                    <button onClick={nextTrack} className="p-4 text-gray-900 dark:text-white hover:opacity-75 transition-opacity">
                        <SkipForward className="w-8 h-8" />
                    </button>
                </div>

                {/* Volume - Simplified for mobile view */}
                <div className="flex items-center justify-center gap-4 text-gray-500">
                    <Volume2 className="w-5 h-5" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-32 accent-gray-500"
                    />
                </div>

            </div>
        );
    }

    // Mini Player (Bottom Bar)
    return (
        <div
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 transform",
                "pb-safe md:pb-0" // Add safe area padding for mobile if needed
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3">
                {/* Progress Bar (Top Border) */}
                <div
                    className="absolute top-0 left-0 h-[2px] bg-amber-500 transition-all duration-300 ease-linear"
                    style={{ width: `${progress}%` }}
                />

                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

                    {/* Left: Track Info */}
                    <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpanded(true)}
                    >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0 group">
                            {currentTrack.imageUrl ? (
                                <img src={currentTrack.imageUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-amber-500">
                                    <Music className="w-6 h-6" />
                                </div>
                            )}
                            {/* Hover expand indicator */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        <div className="flex flex-col overflow-hidden">
                            <span className="font-semibold text-gray-900 dark:text-white truncate text-sm md:text-base">
                                {currentTrack.title}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {currentTrack.artist || 'Rraasi Music'}
                            </span>
                        </div>
                    </div>

                    {/* Center: Controls (Desktop) */}
                    <div className="hidden md:flex items-center gap-4">
                        <button onClick={prevTrack} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <SkipBack className="w-5 h-5" />
                        </button>
                        <button
                            onClick={togglePlayPause}
                            className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                        </button>
                        <button onClick={nextTrack} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <SkipForward className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Right: Actions / Mobile Play */}
                    <div className="flex items-center gap-3">
                        {/* Mobile Play Button (Replacing Volume) */}
                        <div className="md:hidden">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlayPause();
                                }}
                                className="p-2 text-gray-900 dark:text-white"
                            >
                                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                            </button>
                        </div>

                        {/* Desktop Volume & Expand */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="flex items-center gap-2 group/vol">
                                <Volume2 className="w-5 h-5 text-gray-400" />
                                <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-20 accent-gray-500 h-1"
                                    />
                                </div>
                            </div>

                            <button onClick={() => setExpanded(true)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <Maximize2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
