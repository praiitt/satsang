'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { SacredGeometryBg } from '@/components/app/sacred-geometry-bg';
import { useLanguage } from '@/contexts/language-context';
import { Compass } from 'lucide-react';

function OmSymbol() {
    return (
        <motion.div
            className="text-primary mb-6 text-6xl sm:text-8xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            ॐ
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// Reusable Feature Section Component
// ----------------------------------------------------------------------

interface FeatureSectionProps {
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    actionText: string;
    actionHref: string;
    icon: React.ReactNode;
    align: 'left' | 'right';
    gradient: string;
    delay?: number;
    badge?: string;
}

function FeatureSection({
    title,
    subtitle,
    description,
    features,
    actionText,
    actionHref,
    icon,
    align,
    gradient,
    delay = 0,
    badge,
}: FeatureSectionProps) {
    const isLeft = align === 'left';

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay }}
            className={`flex flex-col gap-12 py-16 lg:flex-row lg:items-center ${!isLeft ? 'lg:flex-row-reverse' : ''}`}
        >
            {/* Visual Side */}
            <div className="flex-1 flex justify-center">
                <div className="relative flex h-40 w-40 sm:h-64 sm:w-64 lg:h-96 lg:w-96 items-center justify-center transition-all duration-500 hover:scale-105">
                    {icon}
                </div>
            </div>

            {/* Content Side */}
            <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center gap-3 lg:justify-start mb-2">
                    <h3 className="text-lg font-bold uppercase tracking-wider text-primary">
                        {subtitle}
                    </h3>
                    {badge && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                            {badge}
                        </span>
                    )}
                </div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {title}
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                    {description}
                </p>

                {/* Feature List */}
                <ul className="mb-8 space-y-3 text-left w-fit mx-auto lg:mx-0">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-foreground/80">
                            <svg className="mt-1 h-5 w-5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>

                <Link
                    href={actionHref}
                    className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/20"
                >
                    {actionText}
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </Link>
            </div>
        </motion.div>
    );
}


export const RRaaSiHomeWelcomeView = ({ ref }: React.ComponentProps<'div'>) => {
    const { t } = useLanguage();
    // Default to unmuted as requested, though browsers might block autoplay with sound
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const toggleMute = () => {
        setIsMuted(prev => !prev);
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
        }
    };

    // Attempt to handle autoplay policy
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented:", error);
                    // Fallback: Mute and play if autoplay with sound failed
                    if (!isMuted) {
                        setIsMuted(true);
                        if (videoRef.current) {
                            videoRef.current.muted = true;
                            videoRef.current.play();
                        }
                    }
                });
            }
        }
    }, []);

    return (
        <div ref={ref} className="relative w-full overflow-hidden">
            <SacredGeometryBg />

            {/* Hero Section - Tagline at top, rest at bottom */}
            <section className="relative flex min-h-[90vh] flex-col items-center justify-end px-4 pb-32 pt-20 text-center overflow-hidden">
                {/* Bot Video Background */}
                <div className="absolute inset-0 w-full h-full z-0">
                    <video
                        ref={videoRef}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        className="h-full w-full object-cover"
                    >
                        <source src="https://storage.googleapis.com/ips_bucket_video/36ae7bff4f734639909f53f5148b9f13.mp4" type="video/mp4" />
                    </video>
                    {/* Gradient Overlays for Blending - Reduced opacity for clarity */}
                    <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background dark:from-background/20 dark:via-background/40 dark:to-background" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>

                {/* Fixed Sound Control - Top Right Corner - Icon Only */}
                <button
                    onClick={toggleMute}
                    className="fixed top-16 right-4 z-50 flex items-center justify-center rounded-full bg-black/80 p-3 text-white shadow-2xl backdrop-blur-md transition-all hover:bg-black/90 hover:scale-105 active:scale-95 border-2 border-white/30"
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    )}
                </button>

                {/* Tagline positioned at top */}
                <motion.p
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute top-24 left-0 right-0 z-10 mx-auto max-w-2xl text-xl font-medium text-primary sm:text-2xl md:text-3xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)' }}
                >
                    {t('rraasHome.tagline')}
                </motion.p>

                {/* Rest of content at bottom */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-4xl"
                >
                    <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-foreground sm:text-xl font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.7)' }}>
                        {t('rraasHome.subtitle')} {t('rraasHome.description')}
                    </p>

                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/satsang"
                            className="w-full rounded-full bg-primary px-8 py-4 text-xl font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 sm:w-auto"
                        >
                            {t('rraasHome.ctaStartSatsang')}
                        </Link>
                        <Link
                            href="/feed"
                            className="w-full rounded-full bg-orange-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:bg-orange-700 hover:scale-105 sm:w-auto flex items-center justify-center gap-2"
                        >
                            <Compass className="w-6 h-6 text-white" />
                            RRaaSi Feed
                        </Link>
                        <Link
                            href="#services"
                            className="w-full rounded-full border border-input bg-background/50 backdrop-blur-sm px-8 py-4 text-xl font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground sm:w-auto"
                        >
                            {t('rraasHome.ctaExploreAll')}
                        </Link>
                    </div>

                    {/* Scroll indicator */}
                    <motion.div
                        className="absolute -bottom-32 left-1/2 -translate-x-1/2"
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <svg className="h-8 w-8 text-muted-foreground/80 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </motion.div>
                </motion.div>
            </section>

            {/* How RRAASI Raises Your Vibe */}
            <section className="mx-auto mt-16 mb-8 max-w-6xl px-4 sm:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent inline-block">
                        {t('rraasHome.elevateVibeTitle')}
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto drop-shadow-sm font-medium">
                        {t('rraasHome.elevateVibeDesc')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Step 1: Satsang */}
                    <div className="group relative rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl transition-all hover:-translate-y-2 hover:border-amber-500/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                <img src="/services/satsang-icon-fixed.png" alt="Satsang" className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            </div>
                            <h3 className="mb-3 text-2xl font-bold text-white">{t('rraasHome.elevateStep1Title')}</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {t('rraasHome.elevateStep1Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 2: Music */}
                    <div className="group relative rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl transition-all hover:-translate-y-2 hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/10 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                <img src="/services/music-icon-fixed.png" alt="Music" className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                            </div>
                            <h3 className="mb-3 text-2xl font-bold text-white">{t('rraasHome.elevateStep2Title')}</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {t('rraasHome.elevateStep2Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 3: Astrology & Tarot */}
                    <div className="group relative rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl transition-all hover:-translate-y-2 hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                <img src="/services/tarot-icon-fixed.png" alt="Tarot & Astrology" className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            </div>
                            <h3 className="mb-3 text-2xl font-bold text-white">{t('rraasHome.elevateStep3Title')}</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {t('rraasHome.elevateStep3Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Features Section (Satsang, Astrology, Music) */}
            <section id="services" className="relative px-4 py-20">
                <div className="mx-auto max-w-7xl space-y-24">

                    {/* Satsang */}
                    <FeatureSection
                        title={t('rraasHome.satsangTitle')}
                        subtitle={t('rraasHome.satsangSubtitle')}
                        description={t('rraasHome.satsangDesc')}
                        features={[
                            t('rraasHome.satsangFeature1'),
                            t('rraasHome.satsangFeature2'),
                            t('rraasHome.satsangFeature3'),
                            t('rraasHome.satsangFeature4'),
                        ]}
                        actionText={t('rraasHome.satsangAction')}
                        actionHref="/login?returnUrl=/satsang&service=guru"
                        icon={<img src="/services/satsang-icon-fixed.png" alt="Satsang" className="w-full h-full object-contain drop-shadow-xl" />}
                        align="left"
                        gradient="from-orange-500/30 to-amber-500/30"
                    />

                    {/* Music */}
                    <FeatureSection
                        title={t('rraasHome.musicTitle')}
                        subtitle={t('rraasHome.musicSubtitle')}
                        description={t('rraasHome.musicDesc')}
                        features={[
                            t('rraasHome.musicFeature1'),
                            t('rraasHome.musicFeature2'),
                            t('rraasHome.musicFeature3'),
                            t('rraasHome.musicFeature4'),
                        ]}
                        actionText={t('rraasHome.musicAction')}
                        actionHref="/login?returnUrl=/rraasi-music&service=music"
                        icon={<img src="/services/music-icon-fixed.png" alt="Divine Music" className="w-full h-full object-contain drop-shadow-xl" />}
                        align="right"
                        gradient="from-blue-500/30 to-cyan-500/30"
                    />

                    {/* Tarot */}
                    <FeatureSection
                        title={t('rraasHome.tarotTitle')}
                        subtitle={t('rraasHome.tarotSubtitle')}
                        description={t('rraasHome.tarotDesc')}
                        features={[
                            t('rraasHome.tarotFeature1'),
                            t('rraasHome.tarotFeature2'),
                            t('rraasHome.tarotFeature3'),
                            t('rraasHome.tarotFeature4'),
                        ]}
                        actionText={t('rraasHome.tarotAction')}
                        actionHref="/login?returnUrl=/tarot&service=tarot"
                        icon={<img src="/services/tarot-icon-fixed.png" alt="Mystic Tarot" className="w-full h-full object-contain drop-shadow-xl" />}
                        align="left"
                        gradient="from-purple-500/30 to-indigo-500/30"
                        badge="Coming Soon — Early Access"
                    />

                    {/* Vedic Astrology */}
                    <FeatureSection
                        title={t('rraasHome.astrologyTitle')}
                        subtitle={t('rraasHome.astrologySubtitle')}
                        description={t('rraasHome.astrologyDesc')}
                        features={[
                            t('rraasHome.astrologyFeature1'),
                            t('rraasHome.astrologyFeature2'),
                            t('rraasHome.astrologyFeature3'),
                            t('rraasHome.astrologyFeature4'),
                        ]}
                        actionText={t('rraasHome.astrologyAction')}
                        actionHref="/login?returnUrl=/vedic-jyotish&service=astrology"
                        icon={<img src="/services/astrology-icon-fixed.png" alt="Vedic Astrology" className="w-full h-full object-contain drop-shadow-xl" />}
                        align="left"
                        badge="Coming Soon — Early Access"
                    />

                </div>
            </section>

            {/* Lightworkers Section - Separated from Services */}
            <section className="relative px-4 py-20 bg-gradient-to-b from-background via-amber-500/5 to-background">
                <div className="mx-auto max-w-7xl">
                    <FeatureSection
                        title={t('rraasHome.lightworkerTitle')}
                        subtitle={t('rraasHome.lightworkerSubtitle')}
                        description={t('rraasHome.lightworkerDesc')}
                        features={[
                            t('rraasHome.lightworkerFeature1'),
                            t('rraasHome.lightworkerFeature2'),
                            t('rraasHome.lightworkerFeature3'),
                            t('rraasHome.lightworkerFeature4'),
                        ]}
                        actionText={t('rraasHome.lightworkerAction')}
                        actionHref="/lightworkers"
                        icon={<img src="/services/lightworkers-icon.png" alt="Lightworkers" className="w-full h-full object-contain drop-shadow-xl rounded-full" />}
                        align="right"
                        gradient="from-amber-500/30 to-yellow-500/30"
                    />
                </div>
            </section>

            {/* About RRAASI Section */}
            <section className="bg-muted/30 relative px-4 py-32">
                <div className="mx-auto max-w-4xl text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="mb-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                            {t('rraasHome.aboutTitle')}
                        </h2>
                        <div className="space-y-6 text-xl leading-relaxed text-muted-foreground">
                            <p>{t('rraasHome.aboutDesc1')}</p>
                            <p>{t('rraasHome.aboutDesc2')}</p>
                            <div className="pt-8">
                                <p className="text-2xl font-semibold italic text-primary">"{t('rraasHome.aboutQuote')}"</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Coming Soon Section */}
            <section className="relative px-4 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
                            {t('rraasHome.comingSoonTitle')}
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            {t('rraasHome.comingSoonDesc')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                icon: '📿',
                                title: t('rraasHome.comingSoonMeditation'),
                                desc: t('rraasHome.comingSoonMeditationDesc'),
                            },
                            {
                                icon: '💭',
                                title: t('rraasHome.comingSoonDreams'),
                                desc: t('rraasHome.comingSoonDreamsDesc'),
                            },
                            {
                                icon: '📖',
                                title: t('rraasHome.comingSoonScripture'),
                                desc: t('rraasHome.comingSoonScriptureDesc'),
                            },
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="mb-6 text-5xl opacity-80 transition-transform group-hover:scale-110">{feature.icon}</div>
                                <h3 className="mb-3 text-xl font-bold text-foreground">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.desc}</p>
                                <div className="absolute top-4 right-4 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
                                    {t('rraasHome.comingSoonBadge')}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="relative overflow-hidden bg-primary px-4 py-24 text-primary-foreground">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-soft-light" />
                <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

                <div className="relative mx-auto max-w-4xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                        {t('rraasHome.ctaTitle')}
                    </h2>
                    <p className="mb-10 text-xl font-medium opacity-90">{t('rraasHome.ctaDesc')}</p>
                    <Link
                        href="/satsang"
                        className="inline-flex items-center gap-2 rounded-full bg-background px-10 py-5 text-xl font-bold text-foreground shadow-2xl transition-transform hover:scale-105"
                    >
                        {t('rraasHome.ctaStartSatsang')}
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </div>
            </section>
        </div>
    );
};
