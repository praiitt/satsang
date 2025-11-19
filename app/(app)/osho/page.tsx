import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { OshoApp } from '@/components/app/osho-app';

export default async function OshoAgentPage() {
  await headers();

  // Override app config for Osho agent
  const appConfig: AppConfig = {
    ...APP_CONFIG_DEFAULTS,
    agentName: 'osho', // Use osho agent
    pageTitle: 'Osho – Spiritual Guide & Meditation Master',
    pageDescription:
      'Connect with Osho - an AI-powered spiritual guide specializing in meditation, consciousness, Zen philosophy, dynamic meditation, and the art of living',
  };

  return <OshoApp appConfig={appConfig} />;
}
