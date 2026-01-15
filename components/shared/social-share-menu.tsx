'use client';

import { useState, useEffect } from 'react';
import { Share2, Link2, MessageCircle, Twitter, Facebook, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/livekit/button';

interface SocialShareMenuProps {
    title: string;
    text?: string;
    url: string;
    variant?: 'ghost' | 'outline' | 'default';
    className?: string;
    iconClassName?: string;
}

export function SocialShareMenu({
    title,
    text = '',
    url,
    variant = 'ghost',
    className,
    iconClassName
}: SocialShareMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isOpen]);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Try native share first (Mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text,
                    url
                });
                return;
            } catch (err) {
                // User cancelled or not supported, fallback to menu
                console.log('Native share cancelled/failed, showing menu');
            }
        }

        // Toggle menu for desktop fallback
        setIsOpen(!isOpen);
    };

    const copyToClipboard = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const openSocialLink = (e: React.MouseEvent, socialUrl: string) => {
        e.stopPropagation();
        window.open(socialUrl, '_blank', 'noopener,noreferrer');
        setIsOpen(false);
    };

    const encodedText = encodeURIComponent(`${title}\n${text}`);
    const encodedUrl = encodeURIComponent(url);

    return (
        <div className={cn("relative inline-block", className)}>
            <Button
                variant={variant}
                size="icon"
                onClick={handleShare}
                className={cn(
                    "rounded-full transition-all hover:scale-110 active:scale-95",
                    iconClassName
                )}
                title="Share"
            >
                <Share2 className="w-5 h-5" />
            </Button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2 border-b border-slate-800">
                        <span className="text-xs font-medium text-slate-500 px-2 uppercase tracking-wider">Share via</span>
                    </div>

                    <div className="flex flex-col p-1">
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors w-full text-left"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>

                        <button
                            onClick={(e) => openSocialLink(e, `https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors w-full text-left"
                        >
                            <MessageCircle className="w-4 h-4 text-green-500" />
                            WhatsApp
                        </button>

                        <button
                            onClick={(e) => openSocialLink(e, `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors w-full text-left"
                        >
                            <Twitter className="w-4 h-4 text-sky-500" />
                            X (Twitter)
                        </button>

                        <button
                            onClick={(e) => openSocialLink(e, `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors w-full text-left"
                        >
                            <Facebook className="w-4 h-4 text-blue-600" />
                            Facebook
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
