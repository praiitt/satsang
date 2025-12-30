'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface MusicPlayerCardProps {
    title: string;
    audioUrl: string;
    category?: string;
    duration?: string;
    prompt?: string;
    createdAt?: string;
    onPlay?: () => void;
}

export function MusicPlayerCard({
    title,
    audioUrl,
    category = 'Music',
    duration,
    prompt,
    createdAt,
    onPlay,
}: MusicPlayerCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setTotalDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
            onPlay?.();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden group">
            {/* Category Badge */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2">
                <span className="text-white text-xs font-semibold uppercase tracking-wide">
                    {category}
                </span>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {title}
                </h3>

                {prompt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {prompt}
                    </p>
                )}

                {/* Player Controls */}
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={togglePlay}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-md"
                    >
                        {isPlaying ? (
                            <Pause className="w-5 h-5" fill="currentColor" />
                        ) : (
                            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                        )}
                    </button>

                    <div className="flex-1">
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Time */}
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(totalDuration)}</span>
                        </div>
                    </div>
                </div>

                {/* Metadata */}
                {createdAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </p>
                )}
            </div>

            {/* Hidden Audio Element */}
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
        </div>
    );
}
