import { headers } from 'next/headers';
import { App } from '@/components/app/app';
import { getAppConfig } from '@/lib/utils';

// import { MaintenanceMode } from '@/components/app/maintenance-mode';

export default async function Page() {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  return <App appConfig={appConfig} />;
}
