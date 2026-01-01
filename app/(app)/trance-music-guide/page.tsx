import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { TranceMusicApp } from '@/components/app/trance-music-app';

export default async function TranceMusicGuidePage() {
    await headers();

    // Override app config for Trance Music Guide agent
    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'psychedelic-agent', // Matches LIVEKIT_AGENT_NAME in ecosystem.config
        pageTitle: 'Trance Music Guide – Minimalist Consciousness',
        pageDescription:
            'A digital guide to the psychedelic state of consciousness through music, breath, and insight. No chemicals, just awareness.',
    };

    return <TranceMusicApp appConfig={appConfig} />;
}
