'use client';

import { Button } from '@/components/livekit/button';
import { 
    BookOpen, 
    HeartHandshake, 
    BookMarked, 
    Orbit, 
    Flame, 
    Hash, 
    Star, 
    Compass,
    Sparkles,
    FileText,
    ArrowRight,
    Heart,
    Users
} from 'lucide-react';
import {
    KundliIcon,
    MatchmakingIcon,
    LalKitabIcon,
    SaturnIcon,
    PitraDoshaIcon,
    NumerologyIcon,
    NakshatraIcon,
    AscendantIcon
} from '@/components/icons/astrology-icons';
import { useLanguage } from '@/contexts/language-context';
import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/components/auth/auth-provider';
import { BiorhythmRings } from '@/components/app/biorhythm-rings';
import { DailyCosmicInsight } from '@/components/app/daily-cosmic-insight';
import { HoraTimeline } from '@/components/app/hora-timeline';

interface VedicAstrologyWelcomeViewProps {
    onStartCall: () => void;
}

export function VedicAstrologyWelcomeView({ onStartCall }: VedicAstrologyWelcomeViewProps) {
    const { language } = useLanguage();
    const isHi = language === 'hi';

    const reports = [
        { icon: <KundliIcon className="h-6 w-6" />, labelHi: 'प्रीमियम PDF कुंडली', labelEn: 'Premium PDF Kundli', color: 'from-orange-500 to-amber-500', glow: 'group-hover:shadow-orange-500/50' },
        { icon: <LalKitabIcon className="h-6 w-6" />, labelHi: 'लाल किताब', labelEn: 'Lal Kitab Secrets', color: 'from-red-500 to-orange-600', glow: 'group-hover:shadow-red-500/50' },
        { icon: <SaturnIcon className="h-6 w-6" />, labelHi: 'साढ़े साती', labelEn: 'Sadhe Sati Analysis', color: 'from-indigo-500 to-violet-500', glow: 'group-hover:shadow-indigo-500/50' },
        { icon: <PitraDoshaIcon className="h-6 w-6" />, labelHi: 'पितृ दोष', labelEn: 'Pitra Dosha Check', color: 'from-amber-600 to-red-600', glow: 'group-hover:shadow-amber-500/50' },
        { icon: <NumerologyIcon className="h-6 w-6" />, labelHi: 'अंक ज्योतिष', labelEn: 'Numerology', color: 'from-blue-500 to-cyan-500', glow: 'group-hover:shadow-blue-500/50' },
        { icon: <NakshatraIcon className="h-6 w-6" />, labelHi: 'नक्षत्र ज्ञान', labelEn: 'Nakshatra Insights', color: 'from-yellow-400 to-amber-500', glow: 'group-hover:shadow-yellow-500/50' },
        { icon: <AscendantIcon className="h-6 w-6" />, labelHi: 'लग्न विवरण', labelEn: 'Ascendant Details', color: 'from-emerald-500 to-teal-500', glow: 'group-hover:shadow-emerald-500/50' },
    ];
    
    const matchmakingReports = [
        { id: 'matchmaking', icon: <MatchmakingIcon className="h-8 w-8" />, labelHi: 'कुंडली मिलान', labelEn: 'Matchmaking Report', color: 'from-pink-500 to-rose-500', glow: 'group-hover:shadow-pink-500/50' },
    ];

    const { user } = useAuth();
    const { profile } = useUserProfile();
    
    const [biorhythmData, setBiorhythmData] = useState<any>(null);
    const [nakshatraData, setNakshatraData] = useState<any>(null);
    const [panchangData, setPanchangData] = useState<any>(null);
    const [horaData, setHoraData] = useState<any>(null);
    const [dailyInsightsLoading, setDailyInsightsLoading] = useState(false);

    // Fetch daily insights
    useEffect(() => {
        const fetchDailyInsights = async () => {
            if (!profile || !(profile as any).birthData || !user?.uid) return;
            
            setDailyInsightsLoading(true);
            try {
                const payloadBirthData = {
                    ...(profile as any).birthData,
                    name: (profile as any).birthData.name || (profile as any).name || user.displayName || 'User'
                };
                
                const res = await fetch('/api/astrology/daily-insights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        birthData: payloadBirthData
                    })
                });
                
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        setBiorhythmData(json.data.biorhythm);
                        setNakshatraData(json.data.nakshatraPrediction);
                        setPanchangData(json.data.panchang);
                        setHoraData(json.data.horaMuhurta);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch daily insights:', error);
            } finally {
                setDailyInsightsLoading(false);
            }
        };

        if (user && profile && (profile as any).birthData) {
            fetchDailyInsights();
        }
    }, [user, profile]);

    return (
        <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-slate-950">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/10 blur-[120px]" />
            <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[100px]" />

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-10 px-6 py-12 text-center">
                
                {/* Header Section */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative mb-2 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 backdrop-blur-xl shadow-[0_0_40px_rgba(249,115,22,0.3)]">
                        <Sparkles className="h-12 w-12 text-orange-400 animate-pulse" />
                        <div className="absolute inset-0 rounded-3xl bg-orange-400/20 blur-xl mix-blend-overlay" />
                    </div>
                    
                    <h1 className="text-5xl font-extrabold tracking-tight text-white md:text-7xl">
                        <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                            {isHi ? 'वैदिक ज्योतिष' : 'Vedic Jyotish'}
                        </span>
                    </h1>
                    <h2 className="text-2xl font-medium tracking-wide text-orange-200/80 md:text-3xl">
                        {isHi ? 'प्रीमियम ज्योतिष और रिपोर्ट्स' : 'Premium Jyotish & Reports'}
                    </h2>
                    <p className="max-w-2xl text-lg text-slate-400 font-light mt-2">
                        {isHi 
                            ? 'प्राचीन ज्ञान द्वारा संचालित अति-व्यक्तिगत ज्योतिषीय अंतर्दृष्टि का अनुभव करें। अपने AI ज्योतिषी से बात करें या विस्तृत प्रीमियम रिपोर्ट प्राप्त करें।'
                            : 'Experience hyper-personalized astrological insights powered by ancient wisdom. Talk to your AI Jyotishi or generate in-depth premium reports.'}
                    </p>
                </div>

                {/* Primary Actions - Side by Side */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 w-full justify-center">
                    <Button
                        onClick={onStartCall}
                        className="group relative h-auto overflow-hidden rounded-2xl bg-white px-8 py-4 text-lg font-bold text-slate-900 transition-all hover:scale-105 hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
                                🎙️
                            </div>
                            {isHi ? 'लाइव परामर्श शुरू करें' : 'Start Live Consultation'}
                        </span>
                    </Button>

                    <a
                        href="/vedic-jyotish/reports"
                        className="group relative flex h-auto items-center gap-3 overflow-hidden rounded-2xl border border-orange-500/30 bg-orange-500/10 px-8 py-4 text-lg font-bold text-orange-400 backdrop-blur-md transition-all hover:scale-105 hover:bg-orange-500/20 hover:border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.1)]"
                    >
                        <FileText className="h-6 w-6" />
                        <span>{isHi ? 'मेरी रिपोर्ट्स देखें' : 'View My Reports'}</span>
                        <ArrowRight className="h-5 w-5 opacity-50 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
                    </a>
                </div>

                {/* Daily Cosmic Insights Row */}
                {(profile as any)?.birthData && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col gap-6">
                        <div className="grid md:grid-cols-[1fr_2fr] gap-6 text-left">
                            <div className="[&>div]:bg-slate-900/60 [&>div]:border-slate-700/50 [&>div]:border [&>div]:backdrop-blur-md [&>div]:shadow-2xl">
                                <BiorhythmRings data={biorhythmData} loading={dailyInsightsLoading} />
                            </div>
                            <div className="[&>div]:bg-slate-900/60 [&>div]:border-slate-700/50 [&>div]:border [&>div]:backdrop-blur-md [&>div]:shadow-2xl">
                                <DailyCosmicInsight nakshatraData={nakshatraData} panchangData={panchangData} loading={dailyInsightsLoading} />
                            </div>
                        </div>
                        
                        <div className="text-left [&>div]:bg-slate-900/60 [&>div]:border-slate-700/50 [&>div]:border [&>div]:backdrop-blur-md [&>div]:shadow-2xl">
                            <HoraTimeline data={horaData} loading={dailyInsightsLoading} />
                        </div>
                    </div>
                )}

                {/* Premium Reports Grid Showcase */}
                <div className="mt-8 w-full">
                    <div className="mb-6 flex items-center justify-center gap-3 opacity-80">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-orange-500/50" />
                        <span className="text-sm font-semibold uppercase tracking-widest text-orange-400">
                            {isHi ? 'उपलब्ध प्रीमियम रिपोर्ट्स' : 'Available Premium Reports'}
                        </span>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-orange-500/50" />
                    </div>

                    <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
                        {reports.map((report, index) => (
                            <a
                                href="/vedic-jyotish/reports"
                                key={index}
                                className={`group relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800/80 hover:shadow-2xl ${report.glow}`}
                            >
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${report.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                                    {report.icon}
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-slate-200 transition-colors group-hover:text-white">
                                        {isHi ? report.labelHi : report.labelEn}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Matchmaking Section */}
                <div className="mt-8 w-full max-w-4xl">
                    <div className="mb-6 flex items-center justify-center gap-3 opacity-80">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-pink-500/50" />
                        <span className="text-sm font-semibold uppercase tracking-widest text-pink-400 flex items-center gap-2">
                            <Heart className="w-4 h-4 fill-pink-500 text-pink-500" /> {isHi ? 'लव और कुंडली मिलान' : 'Love & Compatibility'}
                        </span>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-pink-500/50" />
                    </div>

                    <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6 justify-center">
                        <a
                            href="/vedic-jyotish/reports"
                            className="group relative flex cursor-pointer items-center gap-5 overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-br from-slate-900/80 to-slate-900/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/50 hover:shadow-[0_0_40px_rgba(236,72,153,0.15)] w-full"
                        >
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                                <MatchmakingIcon className="h-8 w-8" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="text-lg font-bold text-white mb-1 transition-colors group-hover:text-pink-100">
                                    {isHi ? 'कुंडली मिलान PDF' : 'Premium Match Making PDF'}
                                </div>
                                <p className="text-xs text-slate-400 font-medium">
                                    {isHi ? 'शादी के लिए 36 गुणों का बुनियादी मिलान' : 'A 24-page compatibility check to ensure a harmonious relationship.'}
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-pink-500/50 transition-transform group-hover:translate-x-1 group-hover:text-pink-500" />
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </a>
                        
                        <a
                            href="/vedic-jyotish/reports"
                            className="group relative flex cursor-pointer items-center gap-5 overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-900/80 to-slate-900/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_0_40px_rgba(244,63,94,0.15)] w-full"
                        >
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                                <Users className="h-8 w-8" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="text-lg font-bold text-white mb-1 transition-colors group-hover:text-rose-100">
                                    {isHi ? 'पार्टनर प्रोफाइल' : 'Ideal Partner Profile'}
                                </div>
                                <p className="text-xs text-slate-400 font-medium">
                                    {isHi ? 'ज्योतिष के अनुसार जानें कि आपका आदर्श जीवनसाथी कैसा होगा' : 'Discover what the stars say about the traits of your ideal life partner.'}
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-rose-500/50 transition-transform group-hover:translate-x-1 group-hover:text-rose-500" />
                            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </a>
                    </div>
                </div>

                {/* Trust Indicators */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">✓</div>
                        {isHi ? 'प्रामाणिक वैदिक गणना' : 'Authentic Vedic Math'}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">✓</div>
                        {isHi ? 'विस्तृत PDFs' : 'Detailed PDFs'}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">✓</div>
                        {isHi ? 'तुरंत जनरेशन' : 'Instant Generation'}
                    </div>
                </div>
            </div>
        </div>
    );
}
