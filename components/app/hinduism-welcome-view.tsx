'use client';

import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import Link from 'next/link';

interface HinduismWelcomeViewProps {
    startButtonText?: string;
    onStartCall: () => void;
    guruId: string;
    guruName: string;
}

// Guru-specific SVG icons
function GuruIcon() {
    return (
        <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-orange-600 mb-4 size-16"
        >
            {/* Om symbol */}
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" fill="none" />
            <text
                x="32"
                y="42"
                fontSize="32"
                fill="currentColor"
                textAnchor="middle"
                fontFamily="serif"
                fontWeight="bold"
            >
                ॐ
            </text>
        </svg>
    );
}

export const HinduismWelcomeView = ({
    startButtonText,
    onStartCall,
    guruId,
    guruName,
    ref,
}: React.ComponentProps<'div'> & HinduismWelcomeViewProps) => {
    const { t } = useLanguage();

    const buttonText = startButtonText || t('hinduismGuru.connectButton');

    return (
        <div ref={ref} className="w-full pb-24 md:pb-32">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 -z-10" />

            {/* Hero Section */}
            <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
                {/* Back button */}
                <Link
                    href="/hinduism"
                    className="absolute top-4 left-4 text-orange-700 hover:text-orange-900 flex items-center gap-2"
                >
                    ← {t('hinduismGuru.backToGurus')}
                </Link>

                <GuruIcon />

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-orange-900 sm:text-4xl md:text-5xl lg:text-6xl">
                    {guruName}
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-orange-800 sm:text-lg md:text-xl">
                    {t('hinduismGuru.heroDesc').replace('{name}', guruName)}
                </p>

                {/* Action Button */}
                <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartCall}
                        className="h-14 w-full text-lg font-semibold shadow-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 sm:w-auto sm:min-w-[240px]"
                    >
                        🙏 {buttonText}
                    </Button>
                </div>
                <p className="mt-3 text-sm text-orange-700">{t('hinduismGuru.voiceEnabled')}</p>
            </section>

            {/* Key Features Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
                <h2 className="text-center text-2xl font-bold text-orange-900 md:text-3xl">
                    {t('hinduismGuru.whatYouCanAsk')}
                </h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-orange-200">
                        <div className="text-3xl mb-3">📿</div>
                        <h3 className="text-lg font-semibold text-orange-900">{t('hinduismGuru.spiritualGuidance')}</h3>
                        <p className="mt-2 text-sm text-orange-700">
                            {t('hinduismGuru.spiritualGuidanceDesc')}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-orange-200">
                        <div className="text-3xl mb-3">🧘</div>
                        <h3 className="text-lg font-semibold text-orange-900">{t('hinduismGuru.meditationPractices')}</h3>
                        <p className="mt-2 text-sm text-orange-700">
                            {t('hinduismGuru.meditationPracticesDesc')}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-orange-200">
                        <div className="text-3xl mb-3">📖</div>
                        <h3 className="text-lg font-semibold text-orange-900">{t('hinduismGuru.sacredTeachings')}</h3>
                        <p className="mt-2 text-sm text-orange-700">
                            {t('hinduismGuru.sacredTeachingsDesc')}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-orange-200">
                        <div className="text-3xl mb-3">💭</div>
                        <h3 className="text-lg font-semibold text-orange-900">{t('hinduismGuru.lifeQuestions')}</h3>
                        <p className="mt-2 text-sm text-orange-700">
                            {t('hinduismGuru.lifeQuestionsDesc')}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-orange-200">
                        <div className="text-3xl mb-3">🎥</div>
                        <h3 className="text-lg font-semibold text-orange-900">{t('hinduismGuru.videoTeachings')}</h3>
                        <p className="mt-2 text-sm text-orange-700">
                            {t('hinduismGuru.videoTeachingsDesc')}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-orange-200">
                        <div className="text-3xl mb-3">🌟</div>
                        <h3 className="text-lg font-semibold text-orange-900">{t('hinduismGuru.personalWisdom')}</h3>
                        <p className="mt-2 text-sm text-orange-700">
                            {t('hinduismGuru.personalWisdomDesc')}
                        </p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="mx-auto mt-16 max-w-4xl px-4">
                <h2 className="text-center text-2xl font-bold text-orange-900 md:text-3xl">
                    {t('hinduismGuru.howItWorks')}
                </h2>
                <div className="mt-8 space-y-4">
                    <div className="flex items-start gap-4 rounded-xl bg-white p-6 shadow-md border-l-4 border-orange-500">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                            1
                        </div>
                        <div>
                            <h3 className="font-semibold text-orange-900">{t('hinduismGuru.step1Title')}</h3>
                            <p className="mt-1 text-sm text-orange-700">
                                {t('hinduismGuru.step1Desc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 rounded-xl bg-white p-6 shadow-md border-l-4 border-orange-500">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                            2
                        </div>
                        <div>
                            <h3 className="font-semibold text-orange-900">{t('hinduismGuru.step2Title')}</h3>
                            <p className="mt-1 text-sm text-orange-700">
                                {t('hinduismGuru.step2Desc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 rounded-xl bg-white p-6 shadow-md border-l-4 border-orange-500">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                            3
                        </div>
                        <div>
                            <h3 className="font-semibold text-orange-900">{t('hinduismGuru.step3Title')}</h3>
                            <p className="mt-1 text-sm text-orange-700">
                                {t('hinduismGuru.step3Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Note */}
            <section className="mx-auto mt-16 max-w-2xl px-4 text-center">
                <p className="text-sm text-orange-700">
                    {t('hinduismGuru.footerNote').replace('{name}', guruName)}
                    <br />
                    {t('hinduismGuru.footerNote2')}
                </p>
            </section>
        </div>
    );
};
