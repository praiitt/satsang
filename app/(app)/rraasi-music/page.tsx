import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { RRaaSiMusicApp } from '@/components/app/rraasi-music-app';

export default async function RraasiMusicPage() {
    await headers();

    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'music-agent',
        tokenEndpoint: '/api/rraasi-music/token',
        pageTitle: 'RRAASI Music – Create Healing & Spiritual Music',
        pageDescription:
            'Create your own healing frequencies, bhajans, and meditation music with the help of our AI Music Agent.',
    };

    return <RRaaSiMusicApp appConfig={appConfig} />;
}
