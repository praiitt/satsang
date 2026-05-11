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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ServiceCard
                            emoji="🕉️"
                            title="Live Satsang"
                            desc="Real-time AI-guided satsang sessions with ancient wisdom teachers. Ask anything, explore everything."
                            href="/login?returnUrl=/satsang&service=guru"
                            color="from-orange-500/20 to-amber-500/20"
                            glow="rgba(251,191,36,0.15)"
                            delay={0}
                        />
                        <ServiceCard
                            emoji="🔮"
                            title="Mystic Tarot"
                            desc="AI-powered tarot readings blending ancient card wisdom with your birth chart and current energy."
                            href="/login?returnUrl=/tarot&service=tarot"
                            color="from-purple-500/20 to-violet-500/20"
                            glow="rgba(168,85,247,0.15)"
                            badge="Early Access"
                            delay={0.1}
                        />
                        <ServiceCard
                            emoji="⭐"
                            title="Vedic Jyotish"
                            desc="Deep Vedic birth chart analysis, dasha periods, and cosmic timing for life's key decisions."
                            href="/login?returnUrl=/vedic-jyotish&service=astrology"
                            color="from-indigo-500/20 to-blue-500/20"
                            glow="rgba(99,102,241,0.15)"
                            badge="Early Access"
                            delay={0.2}
                        />
                        <ServiceCard
                            emoji="✨"
                            title="Lightworkers"
                            desc="A sacred community space for healers, seekers & guides to connect and co-create."
                            href="/lightworkers"
                            color="from-yellow-500/20 to-amber-500/20"
                            glow="rgba(234,179,8,0.15)"
                            delay={0.3}
                        />
                        <ServiceCard
                            emoji="📿"
                            title="Meditation"
                            desc="Guided breathwork, pranayama, and mindfulness sessions led by AI wisdom keepers."
                            href="/meditation"
                            color="from-teal-500/20 to-cyan-500/20"
                            glow="rgba(20,184,166,0.15)"
                            delay={0.4}
                        />
                        <ServiceCard
                            emoji="🌐"
                            title="RRaaSi Feed"
                            desc="A living stream of spiritual insights, community creations, and sacred content from around the world."
                            href="/feed"
                            color="from-rose-500/20 to-pink-500/20"
                            glow="rgba(244,63,94,0.15)"
                            delay={0.5}
                        />
                    </div>
                </div>
            </section>

            {/* ── PHILOSOPHY QUOTE ─────────────────────────────────── */}
            <section className="relative px-4 py-24 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(251,191,36,0.05),transparent)]" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9 }}
                    className="relative mx-auto max-w-3xl text-center"
                >
                    <div className="mb-6 text-4xl text-amber-400/60">❝</div>
                    <p className="text-2xl font-light italic leading-relaxed text-white/80 sm:text-3xl">
                        Music is the shortcut to the divine. When words fail, sound carries the soul home.
                    </p>
                    <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-amber-400/60">— RRAASI</p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="mt-12"
                    >
                        <Link
                            href="/login?returnUrl=/rraasi-music&service=music"
                            className="inline-flex items-center gap-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-8 py-4 text-base font-bold text-amber-300 backdrop-blur-sm transition-all hover:bg-amber-500/20 hover:border-amber-400/60 hover:scale-105"
                        >
                            Begin Your Journey
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── GOOGLE OAUTH SECTION (required for verification) ──── */}
            <section className="border-t border-white/5 px-4 py-12">
                <div className="mx-auto max-w-4xl text-left">
                    <h2 className="text-2xl font-bold mb-4 text-white/80">Welcome to RRAASI</h2>
                    <p className="mb-4 text-sm text-white/40 leading-relaxed">
                        RRAASI is a comprehensive spiritual sanctuary offering virtual Satsang, AI Music Creation, Tarot, Vedic Astrology, and healing Music Distribution.
                    </p>
                    <p className="mb-4 text-sm text-white/40 leading-relaxed">
                        <strong className="text-white/60">Purpose of Creator Studio:</strong> Our platform includes a Creator Studio where users generate AI-assisted spiritual healing tracks and mantras. We request the <code className="text-amber-400/70">youtube.upload</code> scope strictly to allow users to distribute their generated music tracks to their own YouTube channels. We only upload when explicitly triggered by the user and never modify or read other channel contents.
                    </p>
                    <p className="text-xs text-white/20 mt-6">
                        RRAASI is a property of Absolute Dimension Pvt Ltd.{' '}
                        <Link href="/privacy" className="underline hover:text-white/40">Privacy Policy</Link>
                    </p>
                </div>
            </section>
        </div>
    );
};
