import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { PsychedelicApp } from '@/components/app/psychedelic-app';

export default async function PsychedelicGuruPage() {
    await headers();

    // Override app config for Psychedelic Guru agent
    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        agentName: 'psychedelic-agent', // Matches LIVEKIT_AGENT_NAME in ecosystem.config
        pageTitle: 'Psychedelic Guide – Minimalist Consciousness',
        pageDescription:
            'A digital guide to the psychedelic state of consciousness through music, breath, and insight. No chemicals, just awareness.',
    };

    return <PsychedelicApp appConfig={appConfig} />;
}
