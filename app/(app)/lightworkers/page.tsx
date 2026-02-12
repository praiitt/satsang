'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { SacredGeometryBg } from '@/components/app/sacred-geometry-bg';
import { useLanguage } from '@/contexts/language-context';

export default function LightworkersPage() {
    const { t } = useLanguage();

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
            <SacredGeometryBg />

            {/* Hero Section */}
            <section className="relative px-4 pt-32 pb-20 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mx-auto max-w-4xl"
                >
                    <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
                        {t('lightworkersPage.title')}
                    </h1>
                    <p className="text-xl leading-relaxed text-muted-foreground sm:text-2xl">
                        {t('lightworkersPage.subtitle')}
                    </p>
                </motion.div>
            </section>

            {/* Main Content */}
            <div className="mx-auto max-w-5xl px-4 pb-32 space-y-24">

                {/* Introduction */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-6 text-center sm:text-left"
                >
                    <div className="rounded-3xl bg-card/30 p-8 backdrop-blur-md border border-border/50 shadow-xl">
                        <p className="text-lg leading-loose text-foreground/90">
                            {t('lightworkersPage.intro')}
                        </p>
                    </div>
                </motion.section>

                {/* Common Traits */}
                <section>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="mb-12 text-3xl font-bold text-center sm:text-4xl"
                    >
                        {t('lightworkersPage.traitsTitle')}
                    </motion.h2>
                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                title: t('lightworkersPage.traits.empathy.title'),
                                desc: t('lightworkersPage.traits.empathy.desc'),
                                icon: "❤️"
                            },
                            {
                                title: t('lightworkersPage.traits.purpose.title'),
                                desc: t('lightworkersPage.traits.purpose.desc'),
                                icon: "🎯"
                            },
                            {
                                title: t('lightworkersPage.traits.rebellion.title'),
                                desc: t('lightworkersPage.traits.rebellion.desc'),
                                icon: "⚡"
                            }
                        ].map((trait, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted p-8 shadow-lg border border-primary/10 hover:border-primary/30 transition-all hover:-translate-y-1"
                            >
                                <div className="mb-4 text-4xl">{trait.icon}</div>
                                <h3 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors">{trait.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{trait.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Core Responsibilities */}
                <section className="relative overflow-hidden rounded-3xl bg-primary/5 px-6 py-16 sm:px-12 border border-primary/10">
                    <div className="absolute top-0 right-0 p-32 bg-primary/10 blur-[100px] rounded-full" />
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-12 text-3xl font-bold text-center sm:text-4xl relative z-10"
                    >
                        {t('lightworkersPage.responsibilitiesTitle')}
                    </motion.h2>
                    <div className="space-y-12 relative z-10">
                        {[
                            {
                                title: t('lightworkersPage.responsibilities.frequency.title'),
                                desc: t('lightworkersPage.responsibilities.frequency.desc')
                            },
                            {
                                title: t('lightworkersPage.responsibilities.shadow.title'),
                                desc: t('lightworkersPage.responsibilities.shadow.desc')
                            },
                            {
                                title: t('lightworkersPage.responsibilities.healing.title'),
                                desc: t('lightworkersPage.responsibilities.healing.desc')
                            }
                        ].map((resp, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="flex flex-col md:flex-row gap-6 items-start"
                            >
                                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xl border border-primary/30">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2 text-foreground">{resp.title}</h3>
                                    <p className="text-lg text-muted-foreground leading-relaxed">{resp.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Missions and Goals */}
                <section>
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-12 text-3xl font-bold text-center sm:text-4xl"
                    >
                        {t('lightworkersPage.missionsTitle')}
                    </motion.h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-8 border border-white/10"
                        >
                            <h3 className="text-2xl font-bold mb-4 text-indigo-400">{t('lightworkersPage.mission1.title')}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('lightworkersPage.mission1.desc')}
                            </p>
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 border border-white/10"
                        >
                            <h3 className="text-2xl font-bold mb-4 text-amber-400">{t('lightworkersPage.mission2.title')}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('lightworkersPage.mission2.desc')}
                            </p>
                        </motion.div>
                    </div>
                </section>


                {/* 144,000 Section */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-background px-6 py-16 sm:px-12 border border-primary/20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 mix-blend-overlay" />
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative z-10 text-center max-w-4xl mx-auto"
                    >
                        <h2 className="mb-6 text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent sm:text-5xl">
                            {t('lightworkersPage.criticalMass.title')}
                        </h2>
                        <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
                            {t('lightworkersPage.criticalMass.desc')}
                        </p>

                        {/* Theory */}
                        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-white/5 shadow-2xl">
                            <h3 className="text-2xl font-bold mb-4 text-primary">{t('lightworkersPage.criticalMass.theory.title')}</h3>
                            <p className="text-lg text-foreground/80 leading-relaxed">
                                {t('lightworkersPage.criticalMass.theory.desc')}
                            </p>
                        </div>

                        {/* Key Aspects */}
                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            {[
                                {
                                    title: t('lightworkersPage.criticalMass.aspects.activation.title'),
                                    desc: t('lightworkersPage.criticalMass.aspects.activation.desc'),
                                    icon: "🧬"
                                },
                                {
                                    title: t('lightworkersPage.criticalMass.aspects.resonance.title'),
                                    desc: t('lightworkersPage.criticalMass.aspects.resonance.desc'),
                                    icon: "🔔"
                                },
                                {
                                    title: t('lightworkersPage.criticalMass.aspects.systemBusters.title'),
                                    desc: t('lightworkersPage.criticalMass.aspects.systemBusters.desc'),
                                    icon: "🚀"
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-background/80 p-6 rounded-xl border border-border shadow-sm">
                                    <div className="text-4xl mb-4">{item.icon}</div>
                                    <h4 className="font-bold text-lg mb-2 text-foreground">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Origins */}
                        <div className="text-left mb-12">
                            <h3 className="text-2xl font-bold mb-6 text-center">{t('lightworkersPage.criticalMass.origins.title')}</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    t('lightworkersPage.criticalMass.origins.bible'),
                                    t('lightworkersPage.criticalMass.origins.geometry'),
                                    t('lightworkersPage.criticalMass.origins.emerald'),
                                    t('lightworkersPage.criticalMass.origins.starseed')
                                ].map((item: any, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 rounded-lg bg-card/30 border border-white/5 hover:bg-card/50 transition-colors">
                                        <div className="h-2 w-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                                        <div>
                                            <span className="block font-bold text-primary mb-1">{item.source}</span>
                                            <span className="text-sm text-muted-foreground">{item.significance}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Numerology & Note */}
                        <div className="space-y-6 bg-primary/5 p-8 rounded-2xl border border-primary/10">
                            <div>
                                <h3 className="font-bold text-xl mb-2 text-foreground">{t('lightworkersPage.criticalMass.numerology.title')}</h3>
                                <p className="text-muted-foreground">{t('lightworkersPage.criticalMass.numerology.desc')}</p>
                            </div>
                            <div className="h-px w-full bg-primary/20" />
                            <p className="text-sm italic text-muted-foreground/80">
                                {t('lightworkersPage.criticalMass.note')}
                            </p>
                        </div>

                    </motion.div>
                </section>

                {/* Types of Lightworkers */}
                <section className="text-center">
                    <h2 className="mb-12 text-3xl font-bold sm:text-4xl">{t('lightworkersPage.typesTitle')}</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {[
                            {
                                name: t('lightworkersPage.types.gridworkers.name'),
                                desc: t('lightworkersPage.types.gridworkers.desc')
                            },
                            {
                                name: t('lightworkersPage.types.gatekeepers.name'),
                                desc: t('lightworkersPage.types.gatekeepers.desc')
                            },
                            {
                                name: t('lightworkersPage.types.messengers.name'),
                                desc: t('lightworkersPage.types.messengers.desc')
                            },
                        ].map((type, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -5 }}
                                className="group relative rounded-xl bg-card px-6 py-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-default"
                            >
                                <div className="font-bold text-lg">{type.name}</div>
                                <div className="text-sm text-muted-foreground group-hover:text-primary/80 transition-colors">{type.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-20 rounded-lg bg-muted p-6 text-sm text-muted-foreground text-center italic max-w-2xl mx-auto"
                >
                    {t('lightworkersPage.disclaimer')}
                </motion.div>

                {/* CTA */}
                <div className="text-center pt-8">
                    <Link
                        href="/"
                        className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        {t('lightworkersPage.backToHome')}
                    </Link>
                </div>

            </div>
        </div>
    );
}
