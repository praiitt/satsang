import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { TarotApp } from '@/components/app/tarot-app';

export const metadata = {
    title: 'Mystic Tarot Reader',
    description: 'Connect with a mystical tarot reader for insights on Love, Career, and Finance.',
};

export default async function TarotPage() {
    await headers();

    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'tarot-agent',
        pageTitle: 'Mystic Tarot Reader',
        pageDescription: 'Connect with a mystical tarot reader for insights on Love, Career, and Finance.',
    };

    return <TarotApp appConfig={appConfig} />;
}
