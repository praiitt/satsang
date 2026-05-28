'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { PenTool, Music, Sparkles, ArrowRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';
import { musicTranslations } from '@/lib/translations/music';
import { useRouter } from 'next/navigation';

interface PoetsLandingViewProps {
    authLoading?: boolean;
    onStartCall: (options?: { intention?: string }) => void;
}

export const PoetsLandingView = ({
    authLoading = false,
    onStartCall
}: PoetsLandingViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { language } = useLanguage();
    const router = useRouter();

    // Translation helper
    const t = musicTranslations[language === 'hi' ? 'hi' : 'en'].poets;

    const features = [
        {
            icon: <PenTool className="w-6 h-6 text-amber-400" />,
            title: t.features.yourWords.title,
            desc: t.features.yourWords.desc
        },
        {
            icon: <Music className="w-6 h-6 text-purple-400" />,
            title: t.features.composition.title,
            desc: t.features.composition.desc
        },
        {
            icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
            title: t.features.eternalArt.title,
            desc: t.features.eternalArt.desc
        },
        {
            icon: <Download className="w-6 h-6 text-green-400" />,
            title: t.features.ownership.title,
            desc: t.features.ownership.desc
        }
    ];

    const handleStart = () => {
        // Redirect to main music page with intention
        router.push('/spiritual-studio?intention=compose_lyrics');
    };

    return (
        <div ref={containerRef} className="w-full min-h-screen bg-[#050505] text-white selection:bg-amber-500/30">

            {/* Abstract Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 pt-20 pb-16 text-center max-w-5xl mx-auto">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-amber-200/80 mb-8"
                >
                    <Sparkles className="w-3 h-3" />
                    <span>{t.badge}</span>
                </motion.div>

                {/* Hero Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-serif font-medium tracking-tight mb-6 bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-transparent"
                >
                    {t.title.replace(t.title_suffix, '')}
                    <br className="hidden md:block" />
                    <span className="italic text-amber-500/90 font-light">{t.title_suffix}</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
                >
                    {t.subtitle}
                </motion.p>

                {/* CTA Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <Button
                        size="lg"
                        onClick={() => onStartCall({ intention: 'compose_lyrics' })}
                        disabled={authLoading}
                        className="h-16 px-10 rounded-full text-lg md:text-xl font-medium bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)] border border-white/10 transition-all hover:scale-105"
                    >
                        {authLoading ? (language === 'hi' ? 'कनेक्ट हो रहा है...' : 'Connecting...') : t.cta}
                        {!authLoading && <ArrowRight className="w-5 h-5 ml-2" />}
                    </Button>
                    <p className="mt-4 text-xs text-white/30 uppercase tracking-widest">
                        {t.poweredBy}
                    </p>
                </motion.div>

                {/* Features Steps */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 w-full text-left"
                >
                    {features.map((f, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                            <div className="mb-4 p-3 rounded-xl bg-black/40 w-fit group-hover:scale-110 transition-transform duration-300 border border-white/5">
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2 font-serif">{f.title}</h3>
                            <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </motion.div>

            </div>
        </div>
    );
};
