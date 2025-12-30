'use client';

import { HeroVideoPlayer } from '@/components/app/hero-video-player';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

function PsychedelicWelcomeImage() {
    return (
        <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-foreground mb-4 size-16 transform transition-transform duration-[2000ms] hover:rotate-180"
        >
            {/* Abstract Psychedelic Eye/Spiral Symbol */}
            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" opacity="0.2" />
            <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="1" opacity="0.8" />
            <circle cx="32" cy="32" r="6" fill="currentColor" />
            {/* Rays */}
            <path d="M32 2 L32 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M32 54 L32 62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 32 L10 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M54 32 L62 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

interface PsychedelicWelcomeViewProps {
    startButtonText?: string;
    onStartCall: () => void;
}

export const PsychedelicWelcomeView = ({
    startButtonText,
    onStartCall,
    ref,
}: React.ComponentProps<'div'> & PsychedelicWelcomeViewProps) => {
    const { t } = useLanguage();

    // Use translation if startButtonText is not provided, otherwise use the provided text
    const buttonText = startButtonText || t('psychedelicGuru.startButton');

    return (
        <div ref={ref} className="w-full pb-24 md:pb-32 bg-gradient-to-b from-background to-background/50">
            {/* Hero Section */}
            <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
                <PsychedelicWelcomeImage />

                <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 animate-gradient-x">
                    {t('psychedelicGuru.title')}
                </h1>
                <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl font-light tracking-wide">
                    {t('psychedelicGuru.description')}
                </p>

                {/* Action Button */}
                <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartCall}
                        className="h-14 w-full text-lg font-semibold shadow-lg shadow-purple-500/20 sm:w-auto sm:min-w-[240px] hover:shadow-purple-500/40 transition-all duration-500"
                    >
                        {buttonText}
                    </Button>
                </div>
                <p className="text-muted-foreground mt-3 text-sm">{t('psychedelicGuru.freeTrial')}</p>
            </section>

            {/* Video Introduction Section */}
            <section className="mx-auto mt-8 w-full max-w-5xl px-4 sm:mt-12 md:mt-16">
                <div className="w-full">
                    <h2 className="text-foreground mb-4 text-center text-xl font-bold sm:mb-6 sm:text-2xl md:text-3xl">
                        {t('psychedelicGuru.videoTitle') || 'Experience the Essence'}
                    </h2>
                    {/* Placeholder for Video - using empty div mostly, or reuse ET video structurally if needed, but keeping it generic for now. 
              Ideally we'd have a specific video URL here. I'll use a placeholder or reuse ET's for now/demo purposes if no specific video provided.
              Actually, let's just comment out the src for now or put a placeholder to avoid broken links.
          */}
                    <div className="overflow-hidden rounded-2xl shadow-2xl border border-white/10 relative aspect-video bg-black/80 flex items-center justify-center">
                        <p className="text-white/50">Video Coming Soon</p>
                        {/* <HeroVideoPlayer
              src="" 
              poster=""
              autoPlay
              loop
              className="w-full"
            /> */}
                    </div>
                    {t('psychedelicGuru.videoDescription') && (
                        <p className="text-muted-foreground mt-4 text-center text-sm leading-6 sm:text-base">
                            {t('psychedelicGuru.videoDescription')}
                        </p>
                    )}
                </div>
            </section>

            {/* Key Features Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
                <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
                    {t('psychedelicGuru.features')}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Feature 1: Music as Vehicle */}
                    <div className="bg-background/50 border-input rounded-2xl border p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-purple-500/50 group">
                        <div className="mb-3 text-3xl group-hover:scale-110 transition-transform">🎵</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            {t('psychedelicGuru.musicAsVehicle')}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            {t('psychedelicGuru.musicAsVehicleDesc')}
                        </p>
                    </div>

                    {/* Feature 2: Breathwork */}
                    <div className="bg-background/50 border-input rounded-2xl border p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-purple-500/50 group">
                        <div className="mb-3 text-3xl group-hover:scale-110 transition-transform">🌬️</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            {t('psychedelicGuru.breathwork')}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            {t('psychedelicGuru.breathworkDesc')}
                        </p>
                    </div>

                    {/* Feature 3: Insight & Release */}
                    <div className="bg-background/50 border-input rounded-2xl border p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-purple-500/50 group">
                        <div className="mb-3 text-3xl group-hover:scale-110 transition-transform">👁️</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            {t('psychedelicGuru.insightRelease')}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            {t('psychedelicGuru.insightReleaseDesc')}
                        </p>
                    </div>

                    {/* Feature 4: Integration */}
                    <div className="bg-background/50 border-input rounded-2xl border p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-purple-500/50 group">
                        <div className="mb-3 text-3xl group-hover:scale-110 transition-transform">🌱</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            {t('psychedelicGuru.integration')}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            {t('psychedelicGuru.integrationDesc')}
                        </p>
                    </div>

                    {/* Feature 5: Safe Space */}
                    <div className="bg-background/50 border-input rounded-2xl border p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-purple-500/50 group">
                        <div className="mb-3 text-3xl group-hover:scale-110 transition-transform">🛡️</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            {t('psychedelicGuru.safeSpace')}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            {t('psychedelicGuru.safeSpaceDesc')}
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="mx-auto mt-8 max-w-4xl px-4">
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-lg sm:flex-row sm:justify-between border border-white/10">
                    <p className="text-base font-semibold sm:text-left">{t('psychedelicGuru.ctaReady')}</p>
                    <div className="flex gap-3">
                        <Button
                            onClick={onStartCall}
                            variant="ghost"
                            className="h-12 bg-white/10 hover:bg-white/20 text-white"
                        >
                            {t('psychedelicGuru.ctaStartNow')}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};
