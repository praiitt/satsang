import { headers } from 'next/headers';
import { App } from '@/components/app/app';
import { getAppConfig } from '@/lib/utils';

// TODO: TEMPORARY MAINTENANCE MODE - Remove this entire component and uncomment the original code below
// To remove: Delete the MaintenanceMode component and uncomment the original Page component
function MaintenanceMode() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white">
      <div className="w-full max-w-xl space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          <span className="text-3xl">🛠️</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Under Maintenance</h1>
        <p className="leading-relaxed text-white/80">
          We&apos;re making some improvements to your Satsang experience. Please check back soon.
        </p>
        <p className="text-sm text-white/60">Thank you for your patience and blessings.</p>
      </div>
    </div>
  );
}

export default async function Page() {
  // TODO: TEMPORARY - Remove this return statement to restore normal home page
  // TEMPORARILY DISABLED FOR LOCAL TESTING - Uncomment below to enable maintenance mode
  // return <MaintenanceMode />;

  // ORIGINAL CODE - Restored for local testing:
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  return <App appConfig={appConfig} />;
}
