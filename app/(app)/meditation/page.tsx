import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { MeditationApp } from '@/components/app/meditation-app';

export const metadata = {
    title: 'RRAASI Meditation – Dance as Dynamic Meditation',
    description: 'AI-guided dance meditation sessions. Connect with your inner peace through joyful movement and spiritual music.',
};

export default async function MeditationPage() {
    await headers();

    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'dance-agent',
        tokenEndpoint: '/api/meditation/token',
        pageTitle: 'RRAASI Meditation – Dance as Dynamic Meditation',
        pageDescription:
            'Experience AI-guided dance meditation. Find peace, release stress, and connect with joy through movement.',
    };

    return <MeditationApp appConfig={appConfig} />;
}
