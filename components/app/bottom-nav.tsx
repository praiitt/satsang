'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  // Hide on LiveSatsang and DailySatsang pages to avoid overlap with their fixed controls
  if (pathname?.startsWith('/livesatsang')) {
    return null;
  }

  const isHome = pathname === '/' || pathname === '' || pathname?.startsWith('/(app)');

  const itemClass = (active: boolean) =>
    cn(
      'flex-1 inline-flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold rounded-xl transition-colors',
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-background/80 text-foreground/80 border border-border'
    );

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-40 mx-auto w-full max-w-md px-3 pb-[max(8px,env(safe-area-inset-bottom))]"
      aria-label="मुख्य नेविगेशन"
    >
      <div className="supports-[backdrop-filter]:bg-background/60 bg-background/90 border-border mx-auto grid grid-cols-1 gap-1.5 rounded-3xl border p-1.5 shadow-xl backdrop-blur">
        <Link href="/" className={itemClass(isHome)} aria-current={isHome ? 'page' : undefined}>
          <span className="text-lg leading-none">🕉️</span>
          <span className="text-[10px] sm:text-xs">सत्संग</span>
        </Link>
      </div>
    </nav>
  );
}
