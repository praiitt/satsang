import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { GurujiApp } from '@/components/app/guruji-app';

export default async function GurujiPage() {
  await headers();

  // Override app config for Guruji agent
  const appConfig: AppConfig = {
    ...APP_CONFIG_DEFAULTS,
    agentName: 'guruji',
    pageTitle: 'Guruji – Your Spiritual Satsang Guide',
    pageDescription:
      'Connect with Guruji, a compassionate spiritual guide rooted in Hindu and Sanatana Dharma, for satsang, dharma, yoga, meditation, karma, bhakti, and Vedanta.',
  };

  return <GurujiApp appConfig={appConfig} />;
}
