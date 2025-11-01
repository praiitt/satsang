import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const hdrs = await headers();
  const { companyName } = await getAppConfig(hdrs);

  return (
    <>
      <header className="fixed top-0 left-0 z-50 hidden w-full items-center justify-center p-6 md:flex">
        <span className="text-foreground text-sm font-semibold tracking-wide">{companyName}</span>
      </header>

      {children}
    </>
  );
}
