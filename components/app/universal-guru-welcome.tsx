'use client';

import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { GuruPastRecordings } from '@/components/app/guru-past-recordings';

interface UniversalGuruWelcomeViewProps {
    startButtonText?: string;
    onStartCall: () => void;
    guruId: string;
    guruName: string;
    // Add new props
    guruImage?: string;
    traditionName?: string;
    traditionEmoji?: string;
    theme?: string; // Tailwind bg class
    prasadText?: string | null;
}

// Dynamic Icon based on emoji
function TraditionIcon({ emoji }: { emoji: string }) {
    return (
        <div className="flex items-center justify-center size-20 rounded-full bg-white/20 backdrop-blur-sm mb-6 text-5xl shadow-lg border-2 border-white/30">
            {emoji}
        </div>
    );
}

export const UniversalGuruWelcomeView = ({
    startButtonText,
    onStartCall,
    guruId,
    guruName,
    guruImage,
    traditionName = 'Hinduism',
    traditionEmoji = '🕉️',
    theme = 'from-orange-50 via-yellow-50 to-red-50',
    prasadText,
    ref,
}: React.ComponentProps<'div'> & UniversalGuruWelcomeViewProps) => {
    const { t } = useLanguage();

    // Use generic text where possible or fallback to Hinduism text but replace
    // Ideally we should have generic keys `universalGuru.*` but for now we patch strings
    // Or we could have passed translated strings as props, but that pushes logic up.

    // Let's use basic string replacement on the translated strings for now to respect the localized content structure
    // This is a pragmatic refactor without rewriting all translation files immediately
    const replaceTradition = (text: string) => {
        return text.replace(/Hindu/g, traditionName).replace(/Hinduism/g, traditionName);
    }

    // We can interpret the existing keys more loosely
    const buttonText = startButtonText || t('hinduismGuru.connectButton');

    // Extract colors from theme for buttons/text roughly
    // This is tricky with arbitrary gradients. Let's assume a primary color based on tradition or passed prop
    // However, Tailwind classes are atomic.
    // We can rely on 'text-primary' if configured, but here we have explicit colors.
    // Let's stick to safe neutral or theme-adaptive styles if possible, OR just use orange (saffron) as a spiritual default?
    // No, blue for Christianity, green for Islam etc.
    // We will use a 'text-current' approach or specific overrides?
    // Let's keep it simple: Use a dark text color for contrast on light backgrounds.

    const textColor = 'text-white';
    const subTextColor = 'text-zinc-300';
    const primaryBtnClass = "bg-white text-black hover:bg-zinc-200 border-0"; 
    const secondaryBtnClass = "border-white/30 text-white hover:bg-white/10 backdrop-blur-md";

    return (
        <div ref={ref} className="w-full pb-24 md:pb-32 text-white relative overflow-hidden">
            {/* Background gradient */}
            <div className={`fixed inset-0 bg-gradient-to-br ${theme} -z-10`} />
            <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay -z-10" />

            {/* Hero Section */}
            <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12 relative z-10">
                {/* Back button */}
                <Link
                    href={`/${guruId ? '../' : ''}`} // Go up one level to tradition
                    className="absolute top-6 left-6 z-30 flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-xl px-4 py-2 text-white shadow-2xl hover:bg-black/60 transition-all border border-white/10"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="font-bold text-xs">{t('hinduismGuru.backToGurus').replace('← ', '') || 'EXIT'}</span>
                </Link>

                {guruImage ? (
                    <div className="flex items-center justify-center size-32 md:size-40 rounded-full border-4 border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.1)] overflow-hidden mb-8 bg-black/40 backdrop-blur-xl group-hover:scale-105 transition-transform duration-500">
                        <img
                            src={guruImage}
                            alt={guruName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <TraditionIcon emoji={traditionEmoji} />
                )}

                {/* Prasad / Post-Session Summary Box */}
                {prasadText && (
                    <div className="w-full max-w-2xl mb-8 animate-in slide-in-from-bottom-4 fade-in duration-700">
                        <div className="bg-black/60 backdrop-blur-2xl p-6 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                            <p className="text-orange-400 text-xs uppercase tracking-widest font-semibold mb-3">✨ Your Spiritual Takeaway</p>
                            <p className="text-white text-lg md:text-xl font-serif leading-relaxed italic relative z-10">
                                &quot;{prasadText}&quot;
                            </p>
                        </div>
                    </div>
                )}

                <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                    {guruName}
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 sm:text-xl md:text-2xl font-medium text-zinc-300 drop-shadow-md">
                    {replaceTradition(t('hinduismGuru.heroDesc').replace('{name}', guruName))}
                </p>

                {/* Action Button */}
                <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartCall}
                        className={`h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px] ${primaryBtnClass}`}
                    >
                        🙏 {buttonText}
                    </Button>
                    <Link href={`/satsang/private/${guruId}`} className="w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="lg"
                            className={`h-14 w-full text-lg font-semibold shadow-lg sm:min-w-[240px] ${secondaryBtnClass}`}
                        >
                            🧘 Private Satsang
                        </Button>
                    </Link>
                </div>

                {/* Suggested Icebreakers (Visual Prompts) */}
                <div className="mt-8 flex flex-col items-center max-w-2xl">
                    <p className="text-xs uppercase tracking-widest text-white/50 mb-3 font-medium">Suggested Topics</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {guruId === 'buddha' ? (
                            <>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Overcoming suffering</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">What is mindfulness?</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Letting go of attachment</span>
                            </>
                        ) : guruId === 'osho' ? (
                            <>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Living dangerously</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Dynamic meditation</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Love and awareness</span>
                            </>
                        ) : guruId === 'jesus' ? (
                            <>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">The Kingdom of Heaven</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Loving your enemies</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Finding inner peace</span>
                            </>
                        ) : guruId === 'shiva' ? (
                            <>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Destroying the ego</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">The cosmic dance</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Stillness in chaos</span>
                            </>
                        ) : (
                            <>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Finding life's purpose</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Overcoming anxiety</span>
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-zinc-300 backdrop-blur-md">Beginning meditation</span>
                            </>
                        )}
                    </div>
                </div>

                <p className="mt-6 text-sm opacity-75">{t('hinduismGuru.voiceEnabled')}</p>

                {/* Past Recordings Section */}
                <div className="w-full max-w-2xl mt-4">
                    <GuruPastRecordings guruId={guruId} type="chat" />
                </div>
            </section>

            {/* Key Features Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16 relative z-10">
                <h2 className="text-center text-3xl font-bold md:text-4xl tracking-tight text-white mb-12">
                    {t('hinduismGuru.whatYouCanAsk')}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { icon: '📿', title: 'hinduismGuru.spiritualGuidance', desc: 'hinduismGuru.spiritualGuidanceDesc' },
                        { icon: '🧘', title: 'hinduismGuru.meditationPractices', desc: 'hinduismGuru.meditationPracticesDesc' },
                        { icon: '📖', title: 'hinduismGuru.sacredTeachings', desc: 'hinduismGuru.sacredTeachingsDesc' },
                        { icon: '💭', title: 'hinduismGuru.lifeQuestions', desc: 'hinduismGuru.lifeQuestionsDesc' },
                        { icon: '🎥', title: 'hinduismGuru.videoTeachings', desc: 'hinduismGuru.videoTeachingsDesc' },
                        { icon: '🌟', title: 'hinduismGuru.personalWisdom', desc: 'hinduismGuru.personalWisdomDesc' },
                    ].map((item, idx) => (
                        <div key={idx} className="group rounded-3xl bg-black/40 backdrop-blur-xl p-8 shadow-2xl border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-300">
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-2">{t(item.title)}</h3>
                            <p className="mt-2 text-sm opacity-75">
                                {t(item.desc)}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="mx-auto mt-24 max-w-4xl px-4 relative z-10">
                <h2 className="text-center text-3xl font-bold md:text-4xl tracking-tight text-white mb-12">
                    {t('hinduismGuru.howItWorks')}
                </h2>
                <div className="space-y-6">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-start gap-6 rounded-3xl bg-black/40 backdrop-blur-xl p-8 shadow-2xl border border-white/10 hover:bg-white/5 transition-colors duration-300">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/20 text-xl font-bold text-white shadow-inner">
                                {step}
                            </div>
                            <div className="pt-1">
                                <h3 className="text-xl font-bold text-white mb-2">{t(`hinduismGuru.step${step}Title`)}</h3>
                                <p className="text-zinc-300 leading-relaxed text-base">
                                    {t(`hinduismGuru.step${step}Desc`)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer Note */}
            <section className="mx-auto mt-16 max-w-2xl px-4 text-center">
                <p className="text-sm opacity-70">
                    {replaceTradition(t('hinduismGuru.footerNote').replace('{name}', guruName))}
                    <br />
                    {replaceTradition(t('hinduismGuru.footerNote2'))}
                </p>
            </section>
        </div>
    );
};
