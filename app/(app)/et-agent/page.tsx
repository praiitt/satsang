import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { ETApp } from '@/components/app/et-app';

export default async function ETAgentPage() {
  await headers();

  // Override app config for ET agent
  const appConfig: AppConfig = {
    ...APP_CONFIG_DEFAULTS,
    agentName: 'etagent', // Use etagent instead of guruji
    pageTitle: 'ET Agent – Explore Extraterrestrial Civilizations',
    pageDescription:
      'Connect with an AI guide specializing in extraterrestrial civilizations, the Fermi Paradox, and cosmic consciousness through sound frequencies',
    // startButtonText will use translations from etAgent.startButton based on language preference
  };

  return <ETApp appConfig={appConfig} />;
}
