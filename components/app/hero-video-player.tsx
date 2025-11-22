'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowsInSimple,
  ArrowsOutSimple,
  PauseIcon,
  PlayIcon,
  SpeakerHigh,
  SpeakerLow,
  SpeakerX,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';
import { cn } from '@/lib/utils';

interface HeroVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  hideProgressBar?: boolean;
}

export function HeroVideoPlayer({
  src,
  poster,
  autoPlay = true,
  loop = true,
  className,
  hideProgressBar = false,
}: HeroVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived
  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const updateIsVertical = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    setIsVertical(v.videoHeight > v.videoWidth);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    updateIsVertical();
  }, [updateIsVertical]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  }, []);

  const setPlayerVolume = useCallback(
    (value: number) => {
      const v = videoRef.current;
      if (!v) return;
      const clamped = Math.max(0, Math.min(100, value));
      setVolume(clamped);
      v.volume = clamped / 100;
      if (clamped > 0 && isMuted) {
        v.muted = false;
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !isMuted;
    v.muted = next;
    setIsMuted(next);
  }, [isMuted]);

  const handleSeek = useCallback(
    (value: number) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const nextTime = (Math.max(0, Math.min(100, value)) / 100) * duration;
      v.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration]
  );

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // no-op
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcuts: space/k play/pause, m mute, arrows for seek
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(document.activeElement)) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(((currentTime + 5) / (duration || 1)) * 100);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(((currentTime - 5) / (duration || 1)) * 100);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleMute, handleSeek, currentTime, duration, toggleFullscreen]);

  // Auto-init volume on mount
  useEffect(() => {
    setPlayerVolume(volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerClasses = cn(
    'relative w-full overflow-hidden rounded-2xl bg-background shadow-xl',
    // For vertical reels, constrain max width and center
    isVertical ? 'mx-auto max-w-[420px]' : '',
    className
  );

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
    >
      <video
        ref={videoRef}
        className={cn('h-full w-full object-cover', isVertical ? 'aspect-[9/16]' : 'aspect-video')}
        src={src}
        poster={poster}
        controls={false}
        playsInline
        muted={isMuted}
        autoPlay={autoPlay}
        loop={loop}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Center Play overlay when paused */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="bg-background/50 text-foreground/90 hover:bg-background/70 absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-4 backdrop-blur transition"
          title="Play"
        >
          <PlayIcon className="h-8 w-8" weight="fill" />
        </button>
      )}

      {/* Controls */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="pointer-events-auto rounded-xl bg-gradient-to-t from-black/50 to-transparent p-3">
          {/* Timeline */}
          {!hideProgressBar && (
            <div className="mb-2 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={progressPercent}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full"
                aria-label="Seek"
              />
              <div className="text-xs text-white/90 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={togglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" weight="fill" />
                ) : (
                  <PlayIcon className="h-5 w-5" weight="fill" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <SpeakerX className="h-5 w-5" weight="fill" />
                ) : volume < 50 ? (
                  <SpeakerLow className="h-5 w-5" weight="fill" />
                ) : (
                  <SpeakerHigh className="h-5 w-5" weight="fill" />
                )}
              </Button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setPlayerVolume(Number(e.target.value))}
                className="w-28"
                aria-label="Volume"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsInSimple className="h-5 w-5" weight="bold" />
              ) : (
                <ArrowsOutSimple className="h-5 w-5" weight="bold" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return '0:00';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
