import { headers } from 'next/headers';
import { VedicReportsView } from '@/components/vedic-astrology/vedic-reports-view';

export const metadata = {
  title: 'My Astrology Reports | Vedic Jyotish',
  description: 'Generate personalised Vedic astrology reports — Nakshatra, Lal Kitab, Sadhe Sati, numerology, and downloadable PDF horoscopes.',
};

export default async function VedicReportsPage() {
  await headers();
  return <VedicReportsView />;
}
