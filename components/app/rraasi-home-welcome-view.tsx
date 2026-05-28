'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { EcosystemFlow } from '@/components/ui/ecosystem-flow';

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

// ─── Latest Community Tracks (Image Cards) ───────────────────────────────────

const CATEGORY_GRADIENTS: Record<string, string> = {
    Devotional: 'from-orange-900/80 to-amber-900/60',
    Meditation: 'from-indigo-900/80 to-purple-900/60',
    Healing: 'from-teal-900/80 to-cyan-900/60',
    Trance: 'from-violet-900/80 to-fuchsia-900/60',
    Mantra: 'from-rose-900/80 to-pink-900/60',
    Spiritual: 'from-zinc-900/80 to-slate-900/60',
};

function LatestTracks() {
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        fetch('/api/music/community-latest')
            .then(r => r.json())
            .then(data => { if (data.tracks) setTracks(data.tracks); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading || tracks.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">{t('rraasHome.latestCreationsTitle')}</h3>
                    <p className="text-sm text-white/40 mt-0.5">{t('rraasHome.latestCreationsSub')}</p>
                </div>
                <Link
                    href="/spiritual-studio"
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                    {t('rraasHome.latestCreationsSeeAll')}
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {tracks.map((track, i) => {
                    const cat = track.musicCategory || 'Spiritual';
                    const grad = CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.Spiritual;
                    return (
                        <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.07 }}
                        >
                            <Link href="/spiritual-studio" className="group block overflow-hidden rounded-2xl border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(251,191,36,0.15)]">
                                {/* Image / gradient cover */}
                                <div className="relative aspect-square w-full overflow-hidden">
                                    {track.imageUrl ? (
                                        <img
                                            src={track.imageUrl}
                                            alt={track.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className={`h-full w-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                                            <span className="text-5xl opacity-60">{cat === 'Trance' ? '🌀' : cat === 'Healing' ? '✨' : cat === 'Meditation' ? '📿' : '🎵'}</span>
                                        </div>
                                    )}
                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 shadow-lg">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-black ml-0.5">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {/* Category pill */}
                                    <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
                                        {cat}
                                    </span>
                                </div>
                                {/* Info */}
                                <div className="p-3 bg-white/5">
                                    <p className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                                        {track.title}
                                    </p>
                                    {track.style && (
                                        <p className="mt-1 text-[10px] text-white/30 line-clamp-1">{track.style}</p>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
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
                        <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">{t('rraasHome.heroLiveBadge')}</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mb-4 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
                    >
                        {t('rraasHome.heroHeadline1')}{' '}
                        <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                            {t('rraasHome.heroHeadline2')}
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65, duration: 0.8 }}
                        className="mb-6 max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl font-medium"
                    >
                        {t('rraasHome.heroSubtitle')}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75, duration: 0.8 }}
                        className="mb-10 max-w-4xl rounded-2xl bg-black/40 border border-white/10 p-6 backdrop-blur-md"
                    >
                        <p className="text-sm sm:text-base leading-relaxed text-white/70 italic">
                            {t('rraasHome.heroProblemStatement')}
                        </p>
                    </motion.div>

                    {/* Primary CTA — Music */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="flex flex-col items-center gap-4 sm:flex-row"
                    >
                        <Link
                            href="/login?returnUrl=/spiritual-studio&service=music"
                            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-lg font-bold text-white shadow-[0_0_40px_rgba(251,191,36,0.4)] transition-all hover:shadow-[0_0_60px_rgba(251,191,36,0.6)] hover:scale-105"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                            {t('rraasHome.heroCta1')}
                            <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100 rounded-full" />
                        </Link>

                        <Link
                            href="/spiritual-studio"
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-400">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            {t('rraasHome.heroCta2')}
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
                                { n: '1000+', label: t('rraasHome.heroStat1') },
                                { n: '50+',   label: t('rraasHome.heroStat2') },
                                { n: t('rraasHome.heroStat3').split(' ')[0], label: t('rraasHome.heroStat3').split(' ').slice(1).join(' ') },
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
                            {t('rraasHome.musicSpotlightBadge')}
                        </span>
                        <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
                            {t('rraasHome.musicSpotlightTitle')}
                        </h2>
                        <p className="mt-1 text-base text-amber-400/60 font-medium">{t('rraasHome.musicSpotlightHindSub')}</p>
                        <p className="mt-4 text-lg text-white/50 max-w-2xl mx-auto">
                            {t('rraasHome.musicSpotlightDesc')}
                        </p>
                        {/* Social proof stats */}
                        <div className="mt-8 flex flex-wrap justify-center gap-6">
                            {[
                                { n: t('rraasHome.musicSpotlightStat1N'), label: t('rraasHome.musicSpotlightStat1L'), icon: '🎵' },
                                { n: t('rraasHome.musicSpotlightStat2N'), label: t('rraasHome.musicSpotlightStat2L'), icon: '✨' },
                                { n: t('rraasHome.musicSpotlightStat3N'), label: t('rraasHome.musicSpotlightStat3L'), icon: '▶️' },
                                { n: t('rraasHome.musicSpotlightStat4N'), label: t('rraasHome.musicSpotlightStat4L'), icon: '🎬' },
                            ].map(s => (
                                <div key={s.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                    <span className="text-lg">{s.icon}</span>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-amber-400">{s.n}</p>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Feature grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
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
                                <h3 className="mb-3 text-3xl font-bold text-white">{t('rraasHome.musicCreateTitle')}</h3>
                                <p className="mb-6 text-white/50 leading-relaxed">
                                    {t('rraasHome.musicCreateDesc')}
                                </p>
                                <div className="space-y-3 mb-8">
                                    {[
                                        t('rraasHome.musicFeatureBhajan'),
                                        t('rraasHome.musicFeatureTrance'),
                                        t('rraasHome.musicFeatureVocals'),
                                        t('rraasHome.musicFeatureLang'),
                                        t('rraasHome.musicFeatureYT'),
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-3 text-white/70 text-sm">
                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    href="/login?returnUrl=/spiritual-studio&service=music"
                                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 px-7 py-3 text-sm font-bold text-black transition-all hover:scale-105 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                                >
                                    {t('rraasHome.musicCtaStart')}
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Right — feature tiles */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: '🤖', title: t('rraasHome.musicTile1Title'), desc: t('rraasHome.musicTile1Desc') },
                                { icon: '🌀', title: t('rraasHome.musicTile2Title'), desc: t('rraasHome.musicTile2Desc') },
                                { icon: '▶️', title: t('rraasHome.musicTile3Title'), desc: t('rraasHome.musicTile3Desc') },
                                { icon: '🎬', title: t('rraasHome.musicTile4Title'), desc: t('rraasHome.musicTile4Desc') },
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

                    {/* Latest Community Creations */}
                    <LatestTracks />
                </div>
            </section>

            {/* ── THE ECOSYSTEM ──────────────────────────────────────── */}
            <EcosystemFlow />

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

            {/* OAuth verification content — hidden visually, kept for crawlers */}
            <div className="sr-only">
                <p>RRAASI is a comprehensive spiritual sanctuary offering virtual Satsang, AI Music Creation, Trance Music, Tarot, Vedic Astrology, and healing Music Distribution. We request the youtube.upload scope strictly to allow users to distribute their generated music tracks to their own YouTube channels. We only upload when explicitly triggered by the user. RRAASI is a property of Absolute Dimension Pvt Ltd.</p>
            </div>

            {/* ── BOTTOM CTA ───────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-primary px-4 py-24 text-primary-foreground">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-soft-light" />
                <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="relative mx-auto max-w-4xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">{t('rraasHome.ctaTitle')}</h2>
                    <p className="mb-10 text-xl font-medium opacity-90">{t('rraasHome.ctaDesc')}</p>
                    <Link
                        href="/login?returnUrl=/spiritual-studio&service=music"
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
