import { headers } from 'next/headers';
import { App } from '@/components/app/app';
// import { MaintenanceMode } from '@/components/app/maintenance-mode';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  // Maintenance mode is currently active - comment out the line below to restore normal home page
  // return <MaintenanceMode />;

  // ORIGINAL CODE - Uncomment below to restore normal home page:
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  return <App appConfig={appConfig} />;
}
