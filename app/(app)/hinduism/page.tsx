'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FindYourGuruQuiz } from '@/components/find-your-guru-quiz';

const gurus = [
    { id: 'shankaracharya', name: 'Adi Shankaracharya', tradition: 'Advaita Vedanta', era: '788-820 CE' },
    { id: 'ramana', name: 'Ramana Maharshi', tradition: 'Self-Inquiry', era: '1879-1950' },
    { id: 'vivekananda', name: 'Swami Vivekananda', tradition: 'Vedanta', era: '1863-1902' },
    { id: 'ramakrishna', name: 'Sri Ramakrishna', tradition: 'Bhakti & Tantra', era: '1836-1886' },
    { id: 'aurobindo', name: 'Sri Aurobindo', tradition: 'Integral Yoga', era: '1872-1950' },
    { id: 'anandamayi_ma', name: 'Anandamayi Ma', tradition: 'Universal Mother', era: '1896-1982' },
    { id: 'neem_karoli_baba', name: 'Neem Karoli Baba', tradition: 'Bhakti', era: '1900-1973' },
    { id: 'yogananda', name: 'Paramahansa Yogananda', tradition: 'Kriya Yoga', era: '1893-1952' },
    { id: 'krishnamurti', name: 'J. Krishnamurti', tradition: 'Freedom', era: '1895-1986' },
    { id: 'ravi_shankar', name: 'Sri Sri Ravi Shankar', tradition: 'Art of Living', era: '1956-present' },
    { id: 'sadhguru', name: 'Sadhguru', tradition: 'Isha Yoga', era: '1957-present' },
    { id: 'amma', name: 'Mata Amritanandamayi', tradition: 'Universal Love', era: '1953-present' },
    { id: 'morari_bapu', name: 'Morari Bapu', tradition: 'Ram Katha', era: '1946-present' },
    { id: 'rakeshbhai', name: 'Rakeshbhai Jhaveri', tradition: 'Modern Spirituality', era: 'Contemporary' },
    { id: 'chinmayananda', name: 'Swami Chinmayananda', tradition: 'Vedanta', era: '1916-1993' },
    { id: 'mukundananda', name: 'Swami Mukundananda', tradition: 'Bhakti Yoga', era: '1960-present' },
    { id: 'kripaluji', name: 'Jagadguru Kripaluji', tradition: 'Radha-Krishna Bhakti', era: '1922-2013' },
    { id: 'prabhupada', name: 'A.C. Bhaktivedanta Swami', tradition: 'ISKCON', era: '1896-1977' },
];

import { useLanguage } from '@/contexts/language-context';

export default function HinduismPage() {
    const router = useRouter();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-5xl font-bold text-center mb-4">
                        🕉️ Hindu Spiritual Masters
                    </h1>
                    <p className="text-center text-orange-100 text-lg max-w-3xl mx-auto mb-8">
                        Connect with the wisdom of India's greatest spiritual teachers. Each master offers unique guidance on the path to enlightenment.
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
                    {gurus.map((guru) => (
                        <Link
                            key={guru.id}
                            href={`/hinduism/${guru.id}`}
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
                        "When the student is ready, the teacher appears" - Buddhist Proverb
                    </p>
                </div>
            </div>
        </div>
    );
}
