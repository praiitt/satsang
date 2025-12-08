import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { VedicAstrologyApp } from '@/components/app/vedic-astrology-app';

export default async function VedicJyotishPage() {
    await headers();

    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'vedic-astrology-agent',
        tokenEndpoint: '/api/vedic-jyotish/token',
        pageTitle: 'Vedic Jyotish – Kundli Analysis & Matchmaking',
        pageDescription:
            'Connect with an AI Jyotishi specializing in Vedic astrology, Kundli matching, and matrimonial compatibility',
    };

    return <VedicAstrologyApp appConfig={appConfig} />;
}
