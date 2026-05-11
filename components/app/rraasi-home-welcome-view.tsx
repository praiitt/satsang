'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/language-context';

// ─── Floating Particle Background ────────────────────────────────────────────

function ParticleField() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: Math.random() * 4 + 1,
                        height: Math.random() * 4 + 1,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        background: i % 3 === 0
                            ? 'rgba(251,191,36,0.6)'
                            : i % 3 === 1
                                ? 'rgba(167,139,250,0.5)'
                                : 'rgba(196,181,253,0.4)',
                    }}
                    animate={{
                        y: [0, -40, 0],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 6,
                        repeat: Infinity,
                        delay: Math.random() * 4,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Waveform Bars ────────────────────────────────────────────────────────────

function WaveformBars() {
    return (
        <div className="flex items-end gap-[3px] h-10">
            {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="w-[3px] rounded-full bg-amber-400/70"
                    animate={{ height: [6, 24 + Math.random() * 16, 6] }}
                    transition={{
                        duration: 0.8 + Math.random() * 0.6,
                        repeat: Infinity,
                        delay: i * 0.06,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Service Card ─────────────────────────────────────────────────────────────

interface ServiceCardProps {
    emoji: string;
    title: string;
    desc: string;
    href: string;
    color: string;
    glow: string;
    badge?: string;
    delay?: number;
}

function ServiceCard({ emoji, title, desc, href, color, glow, badge, delay = 0 }: ServiceCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay }}
        >
            <Link href={href} className="group block h-full">
                <div className={`relative h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_0_30px_${glow}]`}>
                    {badge && (
                        <span className="absolute top-4 right-4 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            {badge}
                        </span>
                    )}
                    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-3xl shadow-lg`}>
                        {emoji}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-white group-hover:text-amber-300 transition-colors">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/50">{desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-white/30 group-hover:text-amber-400 transition-colors">
                        Explore
                        <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const RRaaSiHomeWelcomeView = ({ ref }: React.ComponentProps<'div'>) => {
    const { t } = useLanguage();
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

    const toggleMute = () => {
        setIsMuted(prev => !prev);
        if (videoRef.current) videoRef.current.muted = !isMuted;
    };

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => { });
        }
    }, []);

    return (
        <div ref={ref} className="relative min-h-screen w-full overflow-x-hidden bg-[#060810]">

            {/* ── HERO ──────────────────────────────────────────────── */}
            <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">

                {/* Video Background */}
                <div className="absolute inset-0 z-0">
                    <video
                        ref={videoRef}
                        autoPlay loop muted={isMuted} playsInline
                        className="h-full w-full object-cover opacity-30"
                    >
                        <source src="https://storage.googleapis.com/ips_bucket_video/36ae7bff4f734639909f53f5148b9f13.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-b from-[#060810]/60 via-transparent to-[#060810]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060810] via-transparent to-transparent" />
                    {/* Radial amber glow center */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(251,191,36,0.08),transparent)]" />
                </div>

                <ParticleField />

                <motion.div
                    style={{ opacity: heroOpacity, y: heroY }}
                    className="relative z-10 flex flex-col items-center max-w-4xl"
                >
                    {/* Sanskrit OM */}
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-4 text-7xl sm:text-8xl"
                        style={{ textShadow: '0 0 60px rgba(251,191,36,0.6)' }}
                    >
                        ॐ
                    </motion.div>

                    {/* Live badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">Your AI Spiritual Sanctuary</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mb-4 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
                    >
                        Healing Music,{' '}
                        <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                            Made for Your Soul
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65, duration: 0.8 }}
                        className="mb-10 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl"
                    >
                        Create personalised bhajans, healing frequencies & meditation music with AI — 
                        then explore satsang, astrology and tarot on your journey inward.
                    </motion.p>

                    {/* Primary CTA — Music */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="flex flex-col items-center gap-4 sm:flex-row"
                    >
                        <Link
                            href="/login?returnUrl=/rraasi-music&service=music"
                            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-lg font-bold text-white shadow-[0_0_40px_rgba(251,191,36,0.4)] transition-all hover:shadow-[0_0_60px_rgba(251,191,36,0.6)] hover:scale-105"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                            Create Your Music
                            <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100 rounded-full" />
                        </Link>

                        <Link
                            href="/rraasi-music"
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-400">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            Listen Free
                        </Link>
                    </motion.div>

                    {/* Waveform + stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.1, duration: 1 }}
                        className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:gap-12"
                    >
                        <WaveformBars />
                        <div className="flex gap-8 text-center">
                            {[
                                { n: '∞', label: 'Music Styles' },
                                { n: '50+', label: 'Languages' },
                                { n: 'AI', label: 'Powered' },
                            ].map(s => (
                                <div key={s.label}>
                                    <p className="text-2xl font-bold text-amber-400">{s.n}</p>
                                    <p className="text-xs text-white/40 uppercase tracking-wider">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Mute button */}
                <button
                    onClick={toggleMute}
                    className="fixed top-16 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/80"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                    )}
                </button>

                {/* Scroll hint */}
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
                >
                    <svg className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </motion.div>
            </section>

            {/* ── MUSIC FEATURE SPOTLIGHT ──────────────────────────── */}
            <section className="relative px-4 py-24 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(251,191,36,0.06),transparent)]" />

                <div className="mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="text-center mb-16"
                    >
                        <span className="mb-4 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-400">
                            ✦ Featured
                        </span>
                        <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
                            RRAASI Music
                        </h2>
                        <p className="mt-4 text-lg text-white/50 max-w-2xl mx-auto">
                            The world's first AI that creates personalized spiritual music — bhajans, mantras, healing frequencies — tuned to your soul.
                        </p>
                    </motion.div>

                    {/* Feature grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Left — big visual card */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-orange-950/20 p-8"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.12),transparent)]" />
                            <div className="relative z-10">
                                <div className="mb-6 text-6xl">🎵</div>
                                <h3 className="mb-3 text-3xl font-bold text-white">Create in Seconds</h3>
                                <p className="mb-6 text-white/50 leading-relaxed">
                                    Tell our AI what you feel — devotional, meditative, healing — and it crafts a sacred track just for you in under 2 minutes.
                                </p>
                                <div className="space-y-3 mb-8">
                                    {[
                                        '🎼 Bhajans, Mantras & Healing Frequencies',
                                        '🗣️ Vocals or Purely Instrumental',
                                        '🌐 Hindi, Sanskrit, English & 50+ Languages',
                                        '🎬 AI Music Video Generation',
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-3 text-white/70 text-sm">
                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    href="/login?returnUrl=/rraasi-music&service=music"
                                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 px-7 py-3 text-sm font-bold text-black transition-all hover:scale-105 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                                >
                                    Start Creating — Free
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Right — feature tiles */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: '🤖', title: 'AI Composer', desc: 'Voice-guided music creation in a natural conversation' },
                                { icon: '📿', title: 'Sacred Sounds', desc: 'Solfeggio, 432Hz, binaural beats & Vedic scales' },
                                { icon: '🎧', title: 'Instant Play', desc: 'Stream your curated spiritual playlist anytime' },
                                { icon: '📱', title: 'Share & Distribute', desc: 'Share tracks and playlists with your community' },
                            ].map((f, i) => (
                                <motion.div
                                    key={f.title}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                                >
                                    <div className="mb-3 text-3xl">{f.icon}</div>
                                    <h4 className="mb-1 font-bold text-white text-sm">{f.title}</h4>
                                    <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SPIRITUAL SERVICES ───────────────────────────────── */}
            <section id="services" className="px-4 py-24">
                <div className="mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="mb-14 text-center"
                    >
                        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                            The Complete Sanctuary
                        </h2>
                        <p className="mt-3 text-white/40 max-w-xl mx-auto">
                            Every door opens to a deeper dimension of your spiritual journey.
                        </p>
                    </motion.div>

                    {/* ── Original FeatureSection layout ── */}
                    <div className="space-y-24">

                        {/* Satsang */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.8 }}
                            className="flex flex-col gap-12 py-8 lg:flex-row lg:items-center"
                        >
                            <div className="flex-1 flex justify-center">
                                <div className="relative flex h-40 w-40 sm:h-64 sm:w-64 lg:h-80 lg:w-80 items-center justify-center hover:scale-105 transition-all duration-500">
                                    <img src="/services/satsang-icon-fixed.png" alt="Satsang" className="w-full h-full object-contain drop-shadow-xl" />
                                </div>
                            </div>
                            <div className="flex-1 text-center lg:text-left">
                                <h3 className="text-lg font-bold uppercase tracking-wider text-primary mb-2">{t('rraasHome.satsangSubtitle')}</h3>
                                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('rraasHome.satsangTitle')}</h2>
                                <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{t('rraasHome.satsangDesc')}</p>
                                <ul className="mb-8 space-y-3 text-left w-fit mx-auto lg:mx-0">
                                    {[t('rraasHome.satsangFeature1'), t('rraasHome.satsangFeature2'), t('rraasHome.satsangFeature3'), t('rraasHome.satsangFeature4')].map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-foreground/80">
                                            <svg className="mt-1 h-5 w-5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/login?returnUrl=/satsang&service=guru" className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/20">
                                    {t('rraasHome.satsangAction')}
                                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Tarot */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="flex flex-col gap-12 py-8 lg:flex-row-reverse lg:items-center"
                        >
                            <div className="flex-1 flex justify-center">
                                <div className="relative flex h-40 w-40 sm:h-64 sm:w-64 lg:h-80 lg:w-80 items-center justify-center hover:scale-105 transition-all duration-500">
                                    <img src="/services/tarot-icon-fixed.png" alt="Mystic Tarot" className="w-full h-full object-contain drop-shadow-xl" />
                                </div>
                            </div>
                            <div className="flex-1 text-center lg:text-left">
                                <div className="flex items-center justify-center gap-3 lg:justify-start mb-2">
                                    <h3 className="text-lg font-bold uppercase tracking-wider text-primary">{t('rraasHome.tarotSubtitle')}</h3>
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">Coming Soon — Early Access</span>
                                </div>
                                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('rraasHome.tarotTitle')}</h2>
                                <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{t('rraasHome.tarotDesc')}</p>
                                <ul className="mb-8 space-y-3 text-left w-fit mx-auto lg:mx-0">
                                    {[t('rraasHome.tarotFeature1'), t('rraasHome.tarotFeature2'), t('rraasHome.tarotFeature3'), t('rraasHome.tarotFeature4')].map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-foreground/80">
                                            <svg className="mt-1 h-5 w-5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/login?returnUrl=/tarot&service=tarot" className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/20">
                                    {t('rraasHome.tarotAction')}
                                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Vedic Astrology */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="flex flex-col gap-12 py-8 lg:flex-row lg:items-center"
                        >
                            <div className="flex-1 flex justify-center">
                                <div className="relative flex h-40 w-40 sm:h-64 sm:w-64 lg:h-80 lg:w-80 items-center justify-center hover:scale-105 transition-all duration-500">
                                    <img src="/services/astrology-icon-fixed.png" alt="Vedic Astrology" className="w-full h-full object-contain drop-shadow-xl" />
                                </div>
                            </div>
                            <div className="flex-1 text-center lg:text-left">
                                <div className="flex items-center justify-center gap-3 lg:justify-start mb-2">
                                    <h3 className="text-lg font-bold uppercase tracking-wider text-primary">{t('rraasHome.astrologySubtitle')}</h3>
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">Coming Soon — Early Access</span>
                                </div>
                                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('rraasHome.astrologyTitle')}</h2>
                                <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{t('rraasHome.astrologyDesc')}</p>
                                <ul className="mb-8 space-y-3 text-left w-fit mx-auto lg:mx-0">
                                    {[t('rraasHome.astrologyFeature1'), t('rraasHome.astrologyFeature2'), t('rraasHome.astrologyFeature3'), t('rraasHome.astrologyFeature4')].map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-foreground/80">
                                            <svg className="mt-1 h-5 w-5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/login?returnUrl=/vedic-jyotish&service=astrology" className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/20">
                                    {t('rraasHome.astrologyAction')}
                                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </Link>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            {/* ── LIGHTWORKERS ─────────────────────────────────────── */}
            <section className="relative px-4 py-20 bg-gradient-to-b from-background via-amber-500/5 to-background">
                <div className="mx-auto max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col gap-12 py-8 lg:flex-row-reverse lg:items-center"
                    >
                        <div className="flex-1 flex justify-center">
                            <div className="relative flex h-40 w-40 sm:h-64 sm:w-64 lg:h-80 lg:w-80 items-center justify-center hover:scale-105 transition-all duration-500">
                                <img src="/services/lightworkers-icon.png" alt="Lightworkers" className="w-full h-full object-contain drop-shadow-xl rounded-full" />
                            </div>
                        </div>
                        <div className="flex-1 text-center lg:text-left">
                            <h3 className="text-lg font-bold uppercase tracking-wider text-primary mb-2">{t('rraasHome.lightworkerSubtitle')}</h3>
                            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('rraasHome.lightworkerTitle')}</h2>
                            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{t('rraasHome.lightworkerDesc')}</p>
                            <ul className="mb-8 space-y-3 text-left w-fit mx-auto lg:mx-0">
                                {[t('rraasHome.lightworkerFeature1'), t('rraasHome.lightworkerFeature2'), t('rraasHome.lightworkerFeature3'), t('rraasHome.lightworkerFeature4')].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 text-foreground/80">
                                        <svg className="mt-1 h-5 w-5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/lightworkers" className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/20">
                                {t('rraasHome.lightworkerAction')}
                                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── ABOUT RRAASI ─────────────────────────────────────── */}
            <section className="bg-muted/30 relative px-4 py-32">
                <div className="mx-auto max-w-4xl text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="mb-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{t('rraasHome.aboutTitle')}</h2>
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

            {/* ── COMING SOON ──────────────────────────────────────── */}
            <section className="relative px-4 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">{t('rraasHome.comingSoonTitle')}</h2>
                        <p className="text-xl text-muted-foreground">{t('rraasHome.comingSoonDesc')}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { icon: '📿', title: t('rraasHome.comingSoonMeditation'), desc: t('rraasHome.comingSoonMeditationDesc') },
                            { icon: '💭', title: t('rraasHome.comingSoonDreams'), desc: t('rraasHome.comingSoonDreamsDesc') },
                            { icon: '📖', title: t('rraasHome.comingSoonScripture'), desc: t('rraasHome.comingSoonScriptureDesc') },
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
                                <div className="absolute top-4 right-4 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">{t('rraasHome.comingSoonBadge')}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── GOOGLE OAUTH SECTION (required for verification) ── */}
            <section className="bg-background px-4 py-16 border-t border-border">
                <div className="mx-auto max-w-4xl text-left">
                    <h2 className="text-3xl font-bold mb-6 text-foreground">Welcome to RRAASI</h2>
                    <p className="mb-4 text-lg text-muted-foreground">
                        RRAASI is a comprehensive spiritual sanctuary offering services such as virtual Satsang, intelligent Tarot, Vedic Astrology, and specialized Music Distribution.
                    </p>
                    <p className="mb-4 text-lg text-muted-foreground">
                        <strong>Purpose of the App &amp; Creator Studio:</strong> Our platform includes a Creator Studio feature where users can generate AI-assisted spiritual healing tracks, mantras, and meditation music. We request the <code>youtube.upload</code> scope strictly to allow our users the convenience of instantly distributing these generated music tracks directly to their own YouTube channels. We only upload videos when explicitly triggered by the user in the app, and we never modify or read other channel contents.
                    </p>
                    <p className="text-sm mt-8 text-muted-foreground/70">
                        RRAASI is a property of Absolute Dimension Pvt Ltd.{' '}
                        <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
                    </p>
                </div>
            </section>

            {/* ── BOTTOM CTA ───────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-primary px-4 py-24 text-primary-foreground">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-soft-light" />
                <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="relative mx-auto max-w-4xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">{t('rraasHome.ctaTitle')}</h2>
                    <p className="mb-10 text-xl font-medium opacity-90">{t('rraasHome.ctaDesc')}</p>
                    <Link
                        href="/login?returnUrl=/rraasi-music&service=music"
                        className="inline-flex items-center gap-2 rounded-full bg-background px-10 py-5 text-xl font-bold text-foreground shadow-2xl transition-transform hover:scale-105"
                    >
                        Create Your Music
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </div>
            </section>
        </div>
    );
};
