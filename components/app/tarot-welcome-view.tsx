'use client';

import React from 'react';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

interface TarotWelcomeViewProps extends React.HTMLAttributes<HTMLDivElement> {
    onStartCall: () => void;
}

export function TarotWelcomeView({ onStartCall, ...props }: TarotWelcomeViewProps) {
    const { t } = useLanguage();

    return (
        <section className="bg-indigo-950 flex h-full w-full flex-col items-center justify-center p-4 text-center text-amber-100" {...props}>
            <div className="max-w-md space-y-8 relative z-10">
                <div className="space-y-4">
                    <div className="mx-auto h-24 w-24 rounded-full bg-purple-900 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <span className="text-4xl">🔮</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-serif font-bold tracking-wide text-amber-200">{t('tarot.title')}</h1>
                        <p className="mt-2 text-indigo-200/80">{t('tarot.description')}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm italic text-indigo-300">
                        "{t('tarot.quote')}"
                    </p>
                    <Button
                        onClick={onStartCall}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-6 rounded-xl border border-white/10 shadow-lg transition-all transform hover:scale-105"
                    >
                        {t('tarot.startButton')}
                    </Button>
                </div>
            </div>

            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-purple-600/10 rounded-full blur-3xl opacity-50 mix-blend-screen animate-pulse duration-[4000ms]" />
                <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-indigo-600/10 rounded-full blur-3xl opacity-50 mix-blend-screen animate-pulse duration-[6000ms]" />
            </div>
        </section>
    );
}
