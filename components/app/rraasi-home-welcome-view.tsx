'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { SacredGeometryBg } from '@/components/app/sacred-geometry-bg';
import { useLanguage } from '@/contexts/language-context';

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
    icon: string;
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
                <div className={`relative flex aspect-square h-40 w-40 sm:h-64 sm:w-64 lg:h-96 lg:w-96 items-center justify-center rounded-full bg-gradient-to-br ${gradient} p-1 shadow-2xl transition-all duration-500`}>
                    <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-full bg-background/90 backdrop-blur-sm">
                        <span className="text-6xl sm:text-8xl lg:text-9xl filter drop-shadow-md select-none">{icon}</span>
                    </div>
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

    return (
        <div ref={ref} className="relative w-full overflow-hidden">
            <SacredGeometryBg />

            {/* Hero Section */}
            <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 py-20 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-4xl"
                >
                    <OmSymbol />

                    <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
                        {t('rraasHome.title')}
                    </h1>

                    <p className="mx-auto mb-8 max-w-2xl text-xl font-medium text-primary sm:text-2xl md:text-3xl">
                        {t('rraasHome.tagline')}
                    </p>

                    <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
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
                            href="#services"
                            className="w-full rounded-full border border-input bg-background/50 backdrop-blur-sm px-8 py-4 text-xl font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground sm:w-auto"
                        >
                            {t('rraasHome.ctaExploreAll')}
                        </Link>
                    </div>

                    {/* Scroll indicator */}
                    <motion.div
                        className="absolute bottom-8 left-1/2 -translate-x-1/2"
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <svg className="h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </motion.div>
                </motion.div>
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
                        actionHref="/satsang"
                        icon="🕉️"
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
                        actionHref="/rraasi-music"
                        icon="🎵"
                        align="right"
                        gradient="from-blue-500/30 to-cyan-500/30"
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
                        actionHref="/vedic-jyotish"
                        icon="⭐"
                        align="left"
                        gradient="from-purple-500/30 to-pink-500/30"
                        badge="Coming Soon — Early Access"
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
