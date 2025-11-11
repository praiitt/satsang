'use client';

import Link from 'next/link';
import { LanguageSelector } from '@/components/app/language-selector';
import { LoginLink } from '@/components/app/login-link';
import { useLanguage } from '@/contexts/language-context';

export function SiteHeader() {
  const { t } = useLanguage();

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/75 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="text-xl">🕉️</span>
          <span className="text-foreground text-base sm:text-lg">RRAASI सत्संग</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#faq"
            className="text-muted-foreground hover:text-foreground hidden text-sm sm:inline-block"
          >
            {t('common.faq')}
          </Link>
          <LanguageSelector />
          <LoginLink />
        </nav>
      </div>
    </header>
  );
}
