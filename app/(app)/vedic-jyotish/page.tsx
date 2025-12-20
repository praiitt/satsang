import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { VedicEarlyAccessView } from '@/components/app/vedic-early-access-view';

export default async function VedicJyotishPage() {
    await headers();
    return <VedicEarlyAccessView />;
}
