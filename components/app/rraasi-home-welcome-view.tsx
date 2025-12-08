'use client';

import { motion } from 'motion/react';
import { SacredGeometryBg } from '@/components/app/sacred-geometry-bg';
import { ServiceCard } from '@/components/app/service-card';
import { useLanguage } from '@/contexts/language-context';

function OmSymbol() {
    return (
        <motion.div
            className="text-primary mb-6 text-8xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            ॐ
        </motion.div>
    );
}

export const RRaaSiHomeWelcomeView = ({ ref }: React.ComponentProps<'div'>) => {
    const { t } = useLanguage();

    return (
        <div ref={ref} className="relative w-full">
            <SacredGeometryBg />

            {/* Hero Section */}
            <section className="bg-background relative flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10"
                >
                    <OmSymbol />

                    <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                        {t('rraasHome.title')}
                    </h1>

                    <p className="text-primary mx-auto mb-6 max-w-3xl text-xl font-semibold sm:text-2xl md:text-3xl">
                        {t('rraasHome.tagline')}
                    </p>

                    <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg md:text-xl">
                        {t('rraasHome.subtitle')} {t('rraasHome.description')}
                    </p>

                    {/* Scroll indicator */}
                    <motion.div
                        className="mt-12"
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <svg
                            className="text-muted-foreground mx-auto h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                        </svg>
                    </motion.div>
                </motion.div>
            </section>

            {/* Services Grid Section */}
            <section className="bg-background relative px-4 py-20">
                <div className="mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-12 text-center"
                    >
                        <h2 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
                            {t('rraasHome.explorePath')}
                        </h2>
                        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                            {t('rraasHome.explorePathDesc')}
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <ServiceCard
                                icon="🕉️"
                                title={t('rraasHome.satsangTitle')}
                                description={t('rraasHome.satsangDesc')}
                                actionText={t('rraasHome.satsangAction')}
                                actionHref="/satsang"
                                gradient="from-orange-500/20 to-amber-500/20"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <ServiceCard
                                icon="⭐"
                                title={t('rraasHome.astrologyTitle')}
                                description={t('rraasHome.astrologyDesc')}
                                actionText={t('rraasHome.astrologyAction')}
                                actionHref="/vedic-jyotish"
                                gradient="from-purple-500/20 to-pink-500/20"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <ServiceCard
                                icon="🎵"
                                title={t('rraasHome.musicTitle')}
                                description={t('rraasHome.musicDesc')}
                                actionText={t('rraasHome.musicAction')}
                                actionHref="/rraasi-music"
                                gradient="from-blue-500/20 to-cyan-500/20"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* About RRAASI Section */}
            <section className="bg-muted/30 relative px-4 py-20">
                <div className="mx-auto max-w-4xl text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-foreground mb-6 text-3xl font-bold sm:text-4xl">
                            {t('rraasHome.aboutTitle')}
                        </h2>
                        <div className="text-muted-foreground space-y-4 text-left text-base leading-relaxed sm:text-lg">
                            <p>{t('rraasHome.aboutDesc1')}</p>
                            <p>{t('rraasHome.aboutDesc2')}</p>
                            <p className="text-primary font-semibold italic">{t('rraasHome.aboutQuote')}</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Coming Soon Section */}
            <section className="bg-background relative px-4 py-20">
                <div className="mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-12 text-center"
                    >
                        <h2 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl">
                            {t('rraasHome.comingSoonTitle')}
                        </h2>
                        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                            {t('rraasHome.comingSoonDesc')}
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                icon: '📿',
                                title: t('rraasHome.comingSoonMeditation'),
                                desc: t('rraasHome.comingSoonMeditationDesc'),
                            },
                            {
                                icon: '🌟',
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
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                                className="bg-background border-input rounded-xl border p-6 text-center opacity-60"
                            >
                                <div className="mb-3 text-4xl">{feature.icon}</div>
                                <h3 className="text-foreground mb-2 text-lg font-semibold">{feature.title}</h3>
                                <p className="text-muted-foreground text-sm">{feature.desc}</p>
                                <div className="bg-muted text-muted-foreground mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium">
                                    {t('rraasHome.comingSoonBadge')}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 relative px-4 py-20">
                <div className="mx-auto max-w-4xl text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-foreground mb-6 text-3xl font-bold sm:text-4xl">
                            {t('rraasHome.ctaTitle')}
                        </h2>
                        <p className="text-muted-foreground mb-8 text-lg">{t('rraasHome.ctaDesc')}</p>
                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <a
                                href="/satsang"
                                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-8 py-4 text-lg font-semibold shadow-lg transition-colors"
                            >
                                {t('rraasHome.ctaStartSatsang')}
                            </a>
                            <a
                                href="#services"
                                className="border-input hover:bg-muted inline-flex items-center justify-center rounded-lg border bg-background px-8 py-4 text-lg font-semibold transition-colors"
                            >
                                {t('rraasHome.ctaExploreAll')}
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};
