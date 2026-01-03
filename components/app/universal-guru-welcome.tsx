'use client';

import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import Link from 'next/link';

interface UniversalGuruWelcomeViewProps {
    startButtonText?: string;
    onStartCall: () => void;
    guruId: string;
    guruName: string;
    // Add new props
    traditionName?: string;
    traditionEmoji?: string;
    theme?: string; // Tailwind bg class
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
    traditionName = 'Hinduism',
    traditionEmoji = '🕉️',
    theme = 'from-orange-50 via-yellow-50 to-red-50',
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

    const textColor = 'text-gray-900';
    const subTextColor = 'text-gray-700';
    const primaryBtnClass = "bg-gray-900 text-white hover:bg-black"; // Neutral powerful
    const secondaryBtnClass = "border-gray-900 text-gray-900 hover:bg-gray-100";

    return (
        <div ref={ref} className="w-full pb-24 md:pb-32 text-gray-900">
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme} -z-10`} />

            {/* Hero Section */}
            <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
                {/* Back button */}
                <Link
                    href={`/${guruId ? '../' : ''}`} // Assuming relative back or pass backLink
                    className="absolute top-4 left-4 opacity-70 hover:opacity-100 flex items-center gap-2 font-medium"
                    onClick={(e) => {
                        // We might want to go to tradition page. 
                        // href=".." from /[tradition]/[guruId] goes to /[tradition]
                        // But we are in a component. We need the tradition slug.
                        // Let's just use window.history.back() behavior or link to landing 
                        // Better: Link to `/${traditionSlug}` passed as prop?
                        // For now let's just make it "Back to Gurus" going to root or parent.
                    }}
                >
                    ← {t('hinduismGuru.backToGurus')}
                </Link>

                <TraditionIcon emoji={traditionEmoji} />

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-sm">
                    {guruName}
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl font-medium opacity-90">
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
                    <div className="relative w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="lg"
                            disabled
                            className={`h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px] ${secondaryBtnClass} opacity-70 cursor-not-allowed`}
                            title="Feature coming soon"
                        >
                            🧘 Private Satsang
                        </Button>
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            COMING SOON
                        </span>
                    </div>
                </div>
                <p className="mt-3 text-sm opacity-75">{t('hinduismGuru.voiceEnabled')}</p>
            </section>

            {/* Key Features Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
                <h2 className="text-center text-2xl font-bold md:text-3xl opacity-90">
                    {t('hinduismGuru.whatYouCanAsk')}
                </h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { icon: '📿', title: 'hinduismGuru.spiritualGuidance', desc: 'hinduismGuru.spiritualGuidanceDesc' },
                        { icon: '🧘', title: 'hinduismGuru.meditationPractices', desc: 'hinduismGuru.meditationPracticesDesc' },
                        { icon: '📖', title: 'hinduismGuru.sacredTeachings', desc: 'hinduismGuru.sacredTeachingsDesc' },
                        { icon: '💭', title: 'hinduismGuru.lifeQuestions', desc: 'hinduismGuru.lifeQuestionsDesc' },
                        { icon: '🎥', title: 'hinduismGuru.videoTeachings', desc: 'hinduismGuru.videoTeachingsDesc' },
                        { icon: '🌟', title: 'hinduismGuru.personalWisdom', desc: 'hinduismGuru.personalWisdomDesc' },
                    ].map((item, idx) => (
                        <div key={idx} className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-md border border-white/50">
                            <div className="text-3xl mb-3">{item.icon}</div>
                            <h3 className="text-lg font-semibold opacity-90">{t(item.title)}</h3>
                            <p className="mt-2 text-sm opacity-75">
                                {t(item.desc)}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="mx-auto mt-16 max-w-4xl px-4">
                <h2 className="text-center text-2xl font-bold md:text-3xl opacity-90">
                    {t('hinduismGuru.howItWorks')}
                </h2>
                <div className="mt-8 space-y-4">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-start gap-4 rounded-xl bg-white/80 backdrop-blur-sm p-6 shadow-md border-l-4 border-gray-600">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-800">
                                {step}
                            </div>
                            <div>
                                <h3 className="font-semibold opacity-90">{t(`hinduismGuru.step${step}Title`)}</h3>
                                <p className="mt-1 text-sm opacity-75">
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
