import { headers } from 'next/headers';
import { App } from '@/components/app/app';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  // TODO: TEMPORARY - Remove this return statement to restore normal home page
  // TEMPORARILY DISABLED FOR LOCAL TESTING - Uncomment below to enable maintenance mode
  // return <MaintenanceMode />;

  // ORIGINAL CODE - Restored for local testing:
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  return <App appConfig={appConfig} />;
}
