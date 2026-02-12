import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { VedicEarlyAccessView } from '@/components/app/vedic-early-access-view';
import { VedicAstrologyApp } from '@/components/app/vedic-astrology-app';

export default async function VedicJyotishPage() {
    await headers();

    const vedicConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        pageTitle: 'Vedic Jyotish & Matches',
        pageDescription: 'Experience the ancient wisdom of Vedic Astrology powered by Gemini 3 Pro.',
        agentName: 'vedic-astrology-agent',
        tokenEndpoint: '/api/vedic-jyotish/token',
        startButtonText: 'Consult Jyotish',
        supportsVideoInput: false,
    };

    return <VedicAstrologyApp appConfig={vedicConfig} />;
}
