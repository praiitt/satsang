'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FindYourGuruQuiz } from '@/components/find-your-guru-quiz';
import { useLanguage } from '@/contexts/language-context';
import { ALL_GURUS, TRADITION_DETAILS, DEFAULT_TRADITION_THEME } from '@/lib/gurus';
import { notFound } from 'next/navigation';
import { use } from 'react';

export default function TraditionPage({ params }: { params: Promise<{ tradition: string }> }) {
    const router = useRouter();
    const { t } = useLanguage();
    const { tradition } = use(params);

    // Normalize tradition slug
    const normalizedTradition = tradition.toLowerCase();

    // Filter gurus for this tradition
    const categoryGurus = ALL_GURUS.filter(g => g.category === normalizedTradition);

    // If no gurus found for this tradition, show 404 (or maybe a generic page? better 404 for now)
    if (categoryGurus.length === 0) {
        notFound();
    }

    const details = TRADITION_DETAILS[normalizedTradition] || {
        ...DEFAULT_TRADITION_THEME,
        title: `${normalizedTradition.charAt(0).toUpperCase() + normalizedTradition.slice(1)} Masters`
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br ${details.theme}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-5xl font-bold text-center mb-4">
                        {details.emoji} {details.title}
                    </h1>
                    <p className="text-center text-orange-100 text-lg max-w-3xl mx-auto mb-8">
                        {details.description}
                    </p>

                    <div className="flex justify-center">
                        <FindYourGuruQuiz
                            trigger={
                                <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium transition-all backdrop-blur-sm">
                                    {t('quiz.triggerButton')}
                                </button>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Guru Grid */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoryGurus.map((guru) => (
                        <Link
                            key={guru.id}
                            href={`/${normalizedTradition}/${guru.id}`}
                            className="group block"
                        >
                            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-orange-100 hover:border-orange-400 transform hover:-translate-y-2">
                                {/* Guru Card Header */}
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                                    <div className="text-4xl text-center mb-2">🙏</div>
                                    <h3 className="text-xl font-bold text-center leading-tight">
                                        {guru.name}
                                    </h3>
                                </div>

                                {/* Guru Card Body */}
                                <div className="p-6">
                                    <div className="space-y-2 text-center">
                                        <p className="text-orange-700 font-semibold">
                                            {guru.tradition}
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            {guru.era}
                                        </p>
                                    </div>

                                    {/* Connect Button */}
                                    <button className="mt-4 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform group-hover:scale-105">
                                        Connect Now →
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-orange-100 py-8 mt-12">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-orange-800">
                        "When the student is ready, the teacher appears"
                    </p>
                </div>
            </div>
        </div>
    );
}
