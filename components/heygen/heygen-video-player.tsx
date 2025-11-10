'use client';

import { useEffect, useRef, useState } from 'react';

interface HeygenVideoPlayerProps {
  videoId: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
}

/**
 * HeyGen Embedded Video Player Component
 *
 * Displays a HeyGen pre-recorded video in a responsive iframe.
 * The video automatically adjusts to screen size with a 16:9 aspect ratio.
 *
 * @param videoId - The HeyGen video ID (from the embedded player URL)
 * @param title - Optional title for the video
 * @param className - Additional CSS classes
 * @param autoplay - Whether to autoplay the video (default: false)
 * @param muted - Whether to start muted (default: false)
 */
export function HeygenVideoPlayer({
  videoId,
  title = 'HeyGen video player',
  className = '',
  autoplay = false,
  muted = false,
}: HeygenVideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      setIsLoaded(true);
    }
  }, []);

  // Build the HeyGen embedded player URL
  const embedUrl = `https://app.heygen.com/embedded-player/${videoId}${autoplay ? '?autoplay=1' : ''}${muted ? (autoplay ? '&muted=1' : '?muted=1') : ''}`;

  return (
    <div className={`relative w-full ${className}`} style={{ paddingBottom: '56.25%' }}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        allow="encrypted-media; fullscreen; autoplay"
        allowFullScreen
        className="absolute top-0 left-0 h-full w-full rounded-lg"
        style={{ border: 'none' }}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
      />
      {!isLoaded && (
        <div className="bg-muted absolute inset-0 flex items-center justify-center rounded-lg">
          <div className="text-muted-foreground text-sm">Loading video...</div>
        </div>
      )}
    </div>
  );
}
