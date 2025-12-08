'use client';

import { Button } from '@/components/livekit/button';

interface VedicAstrologyWelcomeViewProps {
    onStartCall: () => void;
}

export function VedicAstrologyWelcomeView({ onStartCall }: VedicAstrologyWelcomeViewProps) {
    return (
        <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-slate-950 dark:via-orange-950 dark:to-red-950">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zm20.97 0l9.315 9.314-1.414 1.414L34.828 0h2.83zM22.344 0L13.03 9.314l1.414 1.414L25.172 0h-2.83zM32 0l12.142 12.142-1.414 1.414L30 .828 17.272 13.556l-1.414-1.414L28 0h4zM.284 0l28 28-1.414 1.414L0 2.544V0h.284zM0 5.373l25.456 25.455-1.414 1.415L0 7.788V5.374zm0 5.656L22.627 33.86l-1.414 1.413L0 13.03v-1.657zm0 5.657l19.799 19.798-1.414 1.414L0 18.686v-2.828zm0 5.657L16.97 38.97l-1.415 1.413L0 24.343v-2.828zm0 5.657L14.142 44.14l-1.414 1.414L0 30v-2.828zm0 5.657L11.314 49.86l-1.414 1.413L0 35.657v-2.828zM0 41.313L8.485 49.8l-1.414 1.415L0 44.142v-2.83zm0 5.657l5.657 5.657-1.414 1.414L0 49.97v-2.828zM54.627 60L30 35.373 5.373 60H8.2l21.8-21.8 21.8 21.8h2.827zm-5.657 0L30 41.03 11.03 60h2.828L30 43.858 46.142 60h2.828zM60 5.373L34.544 30.828l-1.414-1.414L60 2.544V5.373zm0 5.656L39.97 33.86l-1.414-1.413L60 11v-1.657zm0 5.657L37.743 38.97l-1.414-1.413L60 16.686v-2.828zm0 5.657L35.515 44.14l-1.414-1.414L60 22.343v-2.828zm0 5.657L33.284 49.8l-1.414-1.415L60 28v-2.828zm0 5.657L30.314 54.97l-1.414-1.413L60 33.657v-2.828zM60 41.313L27.485 49.8l-1.414-1.415L60 44.142v-2.83zm0 5.657L24.657 58.97l-1.414-1.413L60 49.97v-2.828z' fill='%23f97316' opacity='0.4'/%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Om Symbol Background */}
            <div className="absolute left-1/4 top-1/4 text-amber-200/10 dark:text-orange-900/20 text-[20rem] font-bold select-none pointer-events-none">
                🕉
            </div>

            <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 px-6 text-center">
                {/* Header with Om Symbol */}
                <div className="flex flex-col items-center gap-6">
                    <div className="text-7xl animate-pulse">🪔</div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 bg-clip-text text-transparent dark:from-orange-400 dark:via-red-400 dark:to-amber-400 md:text-6xl">
                        🕉️ वैदिक ज्योतिष
                    </h1>
                    <h2 className="text-3xl font-semibold text-orange-800 dark:text-orange-300 md:text-4xl">
                        Vedic Jyotish & Kundli Milan
                    </h2>
                    <p className="max-w-2xl text-lg text-slate-700 dark:text-slate-300">
                        प्राचीन ज्योतिष शास्त्र से जानिए अपना भविष्य
                        <br />
                        <span className="text-base italic">Discover Your Destiny Through Ancient Wisdom</span>
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                        { icon: '📜', labelHi: 'कुंडली विश्लेषण', labelEn: 'Kundli Analysis' },
                        { icon: '💑', labelHi: 'कुंडली मिलान', labelEn: 'Matchmaking' },
                        { icon: '🔮', labelHi: 'मांगलिक दोष', labelEn: 'Manglik Dosha' },
                        { icon: '🌙', labelHi: 'दैनिक राशिफल', labelEn: 'Daily Rashifal' },
                        { icon: '🪔', labelHi: 'वैदिक उपाय', labelEn: 'Vedic Remedies' },
                        { icon: '⏰', labelHi: 'दशा काल', labelEn: 'Dasha Period' },
                        { icon: '💍', labelHi: 'विवाह मुहूर्त', labelEn: 'Marriage Muhurat' },
                        { icon: '⭐', labelHi: 'नक्षत्र ज्ञान', labelEn: 'Nakshatra' },
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="group relative overflow-hidden rounded-xl border border-orange-200 bg-white/50 p-4 backdrop-blur-sm transition-all hover:scale-105 hover:border-orange-400 hover:shadow-lg dark:border-orange-900 dark:bg-slate-900/50"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-3xl transition-transform group-hover:scale-110">{feature.icon}</div>
                                <div className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                                    {feature.labelHi}
                                </div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-400">{feature.labelEn}</div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-100/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-orange-900/30" />
                        </div>
                    ))}
                </div>

                {/* CTA Button */}
                <div className="flex flex-col items-center gap-4">
                    <Button
                        onClick={onStartCall}
                        size="lg"
                        className="group relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl dark:from-orange-600 dark:via-red-600 dark:to-amber-600"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            🪔 <span className="hidden sm:inline">शुरू करें /</span> Start Your Jyotish Journey
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Button>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Voice-enabled AI Jyotishi • Bilingual Support
                    </p>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500">✓</span>
                        Authentic Vedic Tradition
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500">✓</span>
                        Ashtakoot Matching
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500">✓</span>
                        Personalized Remedies
                    </div>
                </div>
            </div>

            {/* Bottom Decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50" />
        </div>
    );
}
