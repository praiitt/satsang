'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Heart, Waves, Sun, Moon, PartyPopper, Brain, Zap } from 'lucide-react';
import { MeditationStatsCard } from './meditation-stats-card';
import { RecentSessionsList } from './recent-sessions-list';
import Image from 'next/image';
import { useLanguage } from '@/contexts/language-context';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface MeditationWelcomeViewProps {
    onStartCall: () => void;
}

const MOOD_OPTIONS = [
    {
        value: 'peaceful',
        label: 'Peaceful',
        labelHi: 'शांतिपूर्ण',
        icon: Waves,
        color: 'from-blue-500 to-cyan-500'
    },
    {
        value: 'stressed',
        label: 'Stressed',
        labelHi: 'तनावग्रस्त',
        icon: Zap,
        color: 'from-orange-500 to-red-500'
    },
    {
        value: 'joyful',
        label: 'Joyful',
        labelHi: 'आनंदित',
        icon: PartyPopper,
        color: 'from-yellow-500 to-pink-500'
    },
    {
        value: 'tired',
        label: 'Tired',
        labelHi: 'थका हुआ',
        icon: Moon,
        color: 'from-indigo-500 to-purple-500'
    },
] as const;

// Translations
const TEXT = {
    hero: {
        subtitle: { en: "Dance as Dynamic Meditation", hi: "नृत्य: एक गतिशील ध्यान" },
        title: { en: "RRAASI Meditation", hi: "RRaaSi ध्यान" },
        tagline: { en: "Awaken Your Inner Light Through Movement", hi: "नृत्य के माध्यम से अपनी आंतरिक ज्योति जागृत करें" },
        desc: {
            en: "Experience the ancient wisdom of dance meditation, guided by AI. Let go of thoughts, dissolve stress, and discover the joy that lives in your body.",
            hi: "एआई (AI) द्वारा निर्देशित नृत्य ध्यान के प्राचीन ज्ञान का अनुभव करें। विचारों को छोड़ दें, तनाव को मिटा दें, और उस आनंद की खोज करें जो आपके शरीर में बसता है।"
        }
    },
    philosophy: {
        title: { en: "✨ What is Dance Meditation?", hi: "✨ नृत्य ध्यान क्या है?" },
        mind: {
            title: { en: "Quiet the Mind", hi: "मन को शांत करें" },
            desc: { en: "When you dance with full presence, thoughts dissolve. Your mind becomes still, peaceful, and clear.", hi: "जब आप पूर्ण उपस्थिति के साथ नृत्य करते हैं, तो विचार विलीन हो जाते हैं। आपका मन स्थिर, शांत और स्पष्ट हो जाता है।" }
        },
        heart: {
            title: { en: "Open Your Heart", hi: "हृदय को खोलें" },
            desc: { en: "Movement releases stuck emotions. Dance lets love, joy, and gratitude flow freely from your heart.", hi: "आंदोलन फंसी हुई भावनाओं को मुक्त करता है। नृत्य प्रेम, आनंद और कृतज्ञता को आपके हृदय से स्वतंत्र रूप से बहने देता है।" }
        },
        energy: {
            title: { en: "Awaken Energy", hi: "ऊर्जा जागृत करें" },
            desc: { en: "Dance awakens your life force. Feel vibrant, alive, and deeply connected to your true nature.", hi: "नृत्य आपकी प्राण शक्ति को जगाता है। जीवंत, जीवित महसूस करें और अपने सच्चे स्वरूप से गहराई से जुड़ें।" }
        },
        quote: {
            p1: { en: "\"Meditation is not about sitting still. It's about ", hi: "\"ध्यान का अर्थ स्थिर बैठना नहीं है। इसका अर्थ है " },
            highlight1: { en: "being present", hi: "वर्तमान में होना" },
            p2: { en: ". Dance meditation is the art of ", hi: "। नृत्य ध्यान " },
            highlight2: { en: "total presence", hi: "पूर्ण उपस्थिति" },
            p3: { en: " through joyful movement — a moving prayer, a celebration of life, a return to your essence.\"", hi: " की कला है — एक चलती-फिरती प्रार्थना, जीवन का उत्सव, और आपके सार की ओर वापसी।\"" }
        }
    },
    journey: {
        title: { en: "🕐 Your 25-Minute Journey", hi: "🕐 आपकी 25-मिनट की यात्रा" },
        phases: [
            { icon: "🌱", title: { en: "Grounding", hi: "आधार (Grounding)" }, duration: { en: "3 min", hi: "3 मिनट" }, desc: { en: "Connect with earth, breathe deeply, arrive in your body", hi: "पृथ्वी से जुड़ें, गहरी सांस लें, अपने शरीर में आएं" } },
            { icon: "🌊", title: { en: "Awakening", hi: "जागृति (Awakening)" }, duration: { en: "5 min", hi: "5 मिनट" }, desc: { en: "Gentle swaying, warming up, listening to your body", hi: "हल्का डोलना, वार्म-अप, अपने शरीर को सुनना" } },
            { icon: "❤️", title: { en: "Heart Opening", hi: "हृदय खोलना" }, duration: { en: "5 min", hi: "5 मिनट" }, desc: { en: "Expand your chest, open to love and possibility", hi: "अपनी छाती का विस्तार करें, प्रेम और संभावना के लिए खोलें" } },
            { icon: "💃", title: { en: "Free Dance", hi: "मुक्त नृत्य" }, duration: { en: "15 min", hi: "15 मिनट" }, desc: { en: "Complete freedom — let go, express, celebrate", hi: "पूर्ण स्वतंत्रता — छोड़ दें, व्यक्त करें, उत्सव मनाएं" } },
            { icon: "🌙", title: { en: "Cool-down", hi: "शांति (Cool-down)" }, duration: { en: "5 min", hi: "5 मिनट" }, desc: { en: "Gentle return to stillness, integration, gratitude", hi: "स्थिरता, एकीकरण और कृतज्ञता की ओर सौम्य वापसी" } },
            { icon: "🧘", title: { en: "Stillness", hi: "मौन (Stillness)" }, duration: { en: "3 min", hi: "3 मिनट" }, desc: { en: "Rest in silence, absorb the peace, complete", hi: "मौन में विश्राम करें, शांति को आत्मसात करें, पूर्णता" } }
        ]
    },
    start: {
        title: { en: "Begin Your Practice", hi: "अपना अभ्यास शुरू करें" },
        moodLabel: { en: "How are you feeling right now?", hi: "आप अभी कैसा महसूस कर रहे हैं?" },
        intentionBtn: { en: "Set an intention for your practice (optional)", hi: "अपने अभ्यास के लिए एक संकल्प निर्धारित करें (वैकल्पिक)" },
        intentionLabel: { en: "💫 What would you like to cultivate today?", hi: "💫 आज आप क्या विकसित करना चाहेंगे?" },
        intentionPlaceholder: { en: "e.g., Inner peace, Joy, Release stress...", hi: "जैसे: आंतरिक शांति, आनंद, तनाव मुक्ति..." },
        beginBtn: { en: "Begin Your Journey", hi: "अपनी यात्रा शुरू करें" },
        info: {
            duration: { en: "25-30 Minutes", hi: "25-30 मिनट" },
            music: { en: "AI-Selected Music", hi: "एआई चयनित संगीत" },
            voice: { en: "Voice Guidance", hi: "आवाज़ मार्गदर्शन" }
        }
    },
    stats: {
        title: { en: "Your Progress", hi: "आपकी प्रगति" }
    }
};

export function MeditationWelcomeView({ onStartCall }: MeditationWelcomeViewProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [intention, setIntention] = useState('');
    const [mood, setMood] = useState<string>('peaceful');
    const [showIntentionInput, setShowIntentionInput] = useState(false);

    const isHi = language === 'hi';
    const t = isHi ? (obj: { en: string; hi: string }) => obj.hi : (obj: { en: string; hi: string }) => obj.en;

    const handleStartSession = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('meditation_intention', intention || (isHi ? 'शांति और आनंद' : 'Peace and joy'));
            sessionStorage.setItem('meditation_mood', mood);
        }
        onStartCall();
    };

    return (
        <div className="min-h-screen flex flex-col items-center p-4 md:p-8 pb-20">
            {/* Back Button */}
            <div className="w-full max-w-6xl flex justify-start mb-4">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-purple-200/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Exit to Home</span>
                </Link>
            </div>

            {/* Hero Section */}
            <div className="max-w-6xl w-full text-center mb-12 mt-8">
                <div className="inline-flex items-center gap-2 mb-6 text-purple-300 animate-pulse">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-sm font-medium uppercase tracking-wider">
                        {t(TEXT.hero.subtitle)}
                    </span>
                </div>

                <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200 bg-clip-text text-transparent leading-tight">
                    {t(TEXT.hero.title)}
                </h1>

                <p className="text-2xl md:text-3xl text-purple-100 mb-4 font-light">
                    {t(TEXT.hero.tagline)}
                </p>

                <p className="text-lg md:text-xl text-purple-200/80 max-w-3xl mx-auto leading-relaxed mb-8">
                    {t(TEXT.hero.desc)}
                </p>

                {/* Hero Image */}
                <div className="relative w-full max-w-2xl mx-auto h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl">
                    <Image
                        src="/dance_meditation_hero.png"
                        alt="Dance Meditation - Spiritual Movement"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            {/* Philosophy Section */}
            <Card className="max-w-5xl w-full bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-xl border-white/20 p-8 mb-8">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                    {t(TEXT.philosophy.title)}
                </h2>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{t(TEXT.philosophy.mind.title)}</h3>
                        <p className="text-purple-200 text-sm leading-relaxed">
                            {t(TEXT.philosophy.mind.desc)}
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
                            <Heart className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{t(TEXT.philosophy.heart.title)}</h3>
                        <p className="text-purple-200 text-sm leading-relaxed">
                            {t(TEXT.philosophy.heart.desc)}
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{t(TEXT.philosophy.energy.title)}</h3>
                        <p className="text-purple-200 text-sm leading-relaxed">
                            {t(TEXT.philosophy.energy.desc)}
                        </p>
                    </div>
                </div>

                <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
                    <p className="text-purple-100 text-center italic text-lg leading-relaxed">
                        {t(TEXT.philosophy.quote.p1)}<span className="font-semibold text-yellow-200">{t(TEXT.philosophy.quote.highlight1)}</span>
                        {t(TEXT.philosophy.quote.p2)}<span className="font-semibold text-pink-200">{t(TEXT.philosophy.quote.highlight2)}</span>
                        {t(TEXT.philosophy.quote.p3)}
                    </p>
                </div>
            </Card>

            {/* Journey Section */}
            <div className="max-w-5xl w-full mb-12">
                <h2 className="text-3xl font-bold text-white mb-8 text-center">{t(TEXT.journey.title)}</h2>

                <div className="grid md:grid-cols-6 gap-4">
                    {TEXT.journey.phases.map((phase, i) => (
                        <JourneyPhase
                            key={i}
                            icon={phase.icon}
                            title={t(phase.title)}
                            duration={t(phase.duration)}
                            description={t(phase.desc)}
                            highlight={i === 3}
                        />
                    ))}
                </div>
            </div>

            {/* Start Session Card */}
            <Card className="max-w-3xl w-full bg-white/10 backdrop-blur-lg border-white/20 p-8 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{t(TEXT.start.title)}</h2>

                <div className="space-y-6">
                    {/* Mood Selection */}
                    <div>
                        <label className="block text-white text-base font-medium mb-4 text-center">
                            {t(TEXT.start.moodLabel)}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {MOOD_OPTIONS.map(({ value, label, labelHi, icon: Icon, color }) => (
                                <button
                                    key={value}
                                    onClick={() => setMood(value)}
                                    className={`
                    relative p-4 rounded-xl border-2 transition-all transform
                    ${mood === value
                                            ? 'border-white bg-white/20 scale-105 shadow-lg'
                                            : 'border-white/30 hover:border-white/50 hover:bg-white/10 hover:scale-102'
                                        }
                  `}
                                >
                                    <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-white text-sm font-medium">
                                        {isHi ? labelHi : label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Intention Section */}
                    <div>
                        {!showIntentionInput ? (
                            <Button
                                variant="ghost"
                                onClick={() => setShowIntentionInput(true)}
                                className="w-full text-purple-200 hover:text-white hover:bg-white/10 py-6"
                            >
                                <Sparkles className="w-5 h-5 mr-2" />
                                <span className="text-base">{t(TEXT.start.intentionBtn)}</span>
                            </Button>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-white text-sm font-medium">
                                    {t(TEXT.start.intentionLabel)}
                                </label>
                                <input
                                    type="text"
                                    value={intention}
                                    onChange={(e) => setIntention(e.target.value)}
                                    placeholder={t(TEXT.start.intentionPlaceholder)}
                                    className="w-full px-4 py-4 rounded-lg bg-white/10 border-2 border-white/30 text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-base"
                                />
                            </div>
                        )}
                    </div>

                    {/* Start Button */}
                    <Button
                        onClick={handleStartSession}
                        className="w-full py-7 text-xl font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 hover:from-purple-600 hover:via-pink-600 hover:to-yellow-600 text-white rounded-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
                    >
                        <Sun className="w-6 h-6 mr-3" />
                        {t(TEXT.start.beginBtn)}
                    </Button>

                    {/* Session Info */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                        <div className="text-center">
                            <div className="text-2xl mb-1">🕐</div>
                            <div className="text-purple-200 text-xs">{t(TEXT.start.info.duration)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">🎵</div>
                            <div className="text-purple-200 text-xs">{t(TEXT.start.info.music)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">💬</div>
                            <div className="text-purple-200 text-xs">{t(TEXT.start.info.voice)}</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Stats Dashboard */}
            {user && (
                <div className="max-w-5xl w-full mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">{t(TEXT.stats.title)}</h2>
                    <MeditationStatsCard />
                </div>
            )}

            {/* Recent Sessions */}
            {user && (
                <div className="max-w-5xl w-full">
                    <RecentSessionsList />
                </div>
            )}
        </div>
    );
}

function JourneyPhase({
    icon,
    title,
    duration,
    description,
    highlight = false
}: {
    icon: string;
    title: string;
    duration: string;
    description: string;
    highlight?: boolean;
}) {
    return (
        <div className={`
      rounded-xl p-4 text-center transition-all transform hover:scale-105
      ${highlight
                ? 'bg-gradient-to-br from-pink-500/30 to-purple-500/30 border-2 border-pink-400/50'
                : 'bg-white/5 border border-white/10'
            }
    `}>
            <div className="text-4xl mb-2">{icon}</div>
            <div className="font-semibold text-white text-sm mb-1">{title}</div>
            <div className="text-purple-300 text-xs mb-2">{duration}</div>
            <p className="text-purple-200/80 text-xs leading-relaxed">{description}</p>
        </div>
    );
}
