'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/livekit/button';

interface VideoPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    title: string;
}

export function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (videoRef.current) {
                videoRef.current.play().catch(e => console.log('Auto-play blocked', e));
            }
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                    <h3 className="text-white font-medium truncate drop-shadow-md pr-4">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Video Player */}
                <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className="w-full h-full max-h-[80vh]"
                        onEnded={() => {
                            // Optional: Show replay overlay
                        }}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-zinc-900 border-t border-white/10 flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        className="text-white border-white/10 hover:bg-white/10"
                        onClick={() => window.open(videoUrl, '_blank')}
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Original
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            const a = document.createElement('a');
                            a.href = videoUrl;
                            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_video.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download MP4
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
