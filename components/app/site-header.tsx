'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { LanguageSelector } from '@/components/app/language-selector';
import { LoginLink } from '@/components/app/login-link';
import { CoinBalanceBadge } from '@/components/ui/coin-balance-badge';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/components/auth/auth-provider';

export function SiteHeader() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/75 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="text-xl">🕉️</span>
          <span className="text-foreground text-base sm:text-lg">{t('common.siteTitle')}</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">

          {isAuthenticated && (
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Profile"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Profile</span>
            </Link>
          )}
          {isAuthenticated && <CoinBalanceBadge />}
          <LanguageSelector />
          <LoginLink />
        </nav>
      </div>
    </header>
  );
}
