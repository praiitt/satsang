import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { RRaaSiMusicApp } from '@/components/app/rraasi-music-app';

export default async function RraasiMusicPoetsPage() {
    await headers();

    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'music-agent',
        tokenEndpoint: '/api/rraasi-music/token',
        pageTitle: 'Turn Your Lyrics into Music - RRAASI',
        pageDescription:
            'A studio for poets and writers to transform their words into beautiful musical compositions using AI.',
    };

    return <RRaaSiMusicApp appConfig={appConfig} variant="poets" />;
}
