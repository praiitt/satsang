import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { SpiritualStudioApp } from '@/components/app/spiritual-studio-app';

export default async function SpiritualStudioPage() {
    await headers();

    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'music-agent',
        tokenEndpoint: '/api/rraasi-music/token',
        pageTitle: 'Spiritual Studio – Create Healing & Spiritual Media',
        pageDescription:
            'Create your own healing frequencies, short videos, and spiritual artwork.',
    };

    return <SpiritualStudioApp appConfig={appConfig} />;
}
