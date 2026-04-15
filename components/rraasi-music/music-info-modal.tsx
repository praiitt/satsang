'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Heart, Music, Tag } from 'lucide-react';
import { Button } from '@/components/livekit/button';

interface MusicInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    story?: string;
    lyrics?: string;
    healingBenefits?: string[];
    tags?: string[];
    description?: string;
}

export function MusicInfoModal({
    isOpen,
    onClose,
    title,
    story,
    lyrics,
    healingBenefits,
    tags,
    description
}: MusicInfoModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    // Default to description if story is missing but description exists
    const displayStory = story || description;
    
    // Ensure arrays
    const displayBenefits = Array.isArray(healingBenefits) ? healingBenefits : [];
    const displayTags = Array.isArray(tags) ? tags : [];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5 sticky top-0 z-10">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate pr-4 drop-shadow-sm">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-5 sm:p-8 space-y-8 flex-1 custom-scrollbar">
                    
                    {/* Story / Description Section */}
                    {displayStory && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-amber-500">
                                <BookOpen className="w-5 h-5" />
                                <h3 className="text-lg font-semibold tracking-wide uppercase">The Story</h3>
                            </div>
                            <p className="text-white/80 text-sm sm:text-base leading-relaxed p-4 rounded-2xl bg-white/5 border border-white/5 inline-block">
                                {displayStory}
                            </p>
                        </section>
                    )}

                    {/* Healing Benefits */}
                    {displayBenefits.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-rose-400">
                                <Heart className="w-5 h-5" />
                                <h3 className="text-lg font-semibold tracking-wide uppercase">Healing Benefits</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {displayBenefits.map((benefit, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-300 text-sm font-medium border border-rose-500/20">
                                        {benefit}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Lyrics */}
                    {lyrics && lyrics.trim() !== '' && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-cyan-400">
                                <Music className="w-5 h-5" />
                                <h3 className="text-lg font-semibold tracking-wide uppercase">Lyrics & Mantras</h3>
                            </div>
                            <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/10">
                                <pre className="whitespace-pre-wrap font-sans text-cyan-50/80 text-sm sm:text-base leading-relaxed">
                                    {lyrics}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Tags */}
                    {displayTags.length > 0 && (
                        <section className="pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-white/40 mb-3">
                                <Tag className="w-4 h-4" />
                                <h3 className="text-xs font-semibold tracking-wider uppercase">Tags</h3>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {displayTags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 rounded-md bg-white/5 text-white/50 text-xs">
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Empty State Fallback */}
                    {(!displayStory && !lyrics && displayBenefits.length === 0 && displayTags.length === 0) && (
                        <div className="text-center py-12 text-white/40">
                            <p>No additional details available for this track.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
