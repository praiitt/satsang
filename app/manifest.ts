import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RRAASI',
    short_name: 'RRAASI',
    description: 'Connect with the divine through RRAASI: Spiritual Music, Tarot, and Live Satsang.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/mobile-app-icon.png', // Ideally use a high-qual logo if available, falling back to existing or user's preference
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/mobile-app-icon.png', // Using the same for 512 for now if no other specific file, or keep original?
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['spiritual', 'social', 'entertainment'],
    shortcuts: [
      {
        name: 'Live Satsang',
        short_name: 'Live',
        description: 'Join Live Satsang Session',
        url: '/livesatsang',
        icons: [{ src: '/mobile-app-icon.png', sizes: '192x192' }],
      },
    ],
  };
}
