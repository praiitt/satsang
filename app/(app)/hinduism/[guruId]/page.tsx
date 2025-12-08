import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { HinduismApp } from '@/components/app/hinduism-app';
import { notFound } from 'next/navigation';

const VALID_GURU_IDS = [
    'shankaracharya',
    'ramana',
    'vivekananda',
    'ramakrishna',
    'aurobindo',
    'anandamayi_ma',
    'neem_karoli_baba',
    'yogananda',
    'krishnamurti',
    'ravi_shankar',
    'sadhguru',
    'amma',
    'morari_bapu',
    'rakeshbhai',
    'chinmayananda',
    'mukundananda',
    'kripaluji',
    'prabhupada',
];

const GURU_DISPLAY_NAMES: Record<string, string> = {
    shankaracharya: 'Adi Shankaracharya',
    ramana: 'Ramana Maharshi',
    vivekananda: 'Swami Vivekananda',
    ramakrishna: 'Sri Ramakrishna Paramahamsa',
    aurobindo: 'Sri Aurobindo',
    anandamayi_ma: 'Anandamayi Ma',
    neem_karoli_baba: 'Neem Karoli Baba',
    yogananda: 'Paramahansa Yogananda',
    krishnamurti: 'Jiddu Krishnamurti',
    ravi_shankar: 'Sri Sri Ravi Shankar',
    sadhguru: 'Sadhguru Jaggi Vasudev',
    amma: 'Mata Amritanandamayi (Amma)',
    morari_bapu: 'Morari Bapu',
    rakeshbhai: 'Gurudev Shri Rakeshbhai Jhaveri',
    chinmayananda: 'Swami Chinmayananda',
    mukundananda: 'Swami Mukundananda',
    kripaluji: 'Jagadguru Kripaluji Maharaj',
    prabhupada: 'A.C. Bhaktivedanta Swami Prabhupada',
};

export default async function HinduismGuruPage({
    params,
}: {
    params: Promise<{ guruId: string }>;
}) {
    await headers();
    const { guruId } = await params;

    // Validate guru ID
    if (!VALID_GURU_IDS.includes(guruId)) {
        notFound();
    }

    const guruName = GURU_DISPLAY_NAMES[guruId] || guruId;

    // Override app config for this guru
    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'hinduism-agent',
        pageTitle: `${guruName} – Hindu Spiritual Master`,
        pageDescription: `Connect with ${guruName} - an AI-powered spiritual guide bringing timeless Hindu wisdom`,
        metadata: {
            guruId, // Pass guru ID to backend
        },
    };

    return <HinduismApp appConfig={appConfig} guruId={guruId} guruName={guruName} />;
}

// Generate static params for all gurus
export function generateStaticParams() {
    return VALID_GURU_IDS.map((guruId) => ({
        guruId,
    }));
}
