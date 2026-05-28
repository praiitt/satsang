'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { LanguageSelector } from '@/components/app/language-selector';
import { LoginLink } from '@/components/app/login-link';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/components/auth/auth-provider';
import { Logo } from '@/components/ui/logo';
import { ServiceNav } from '@/components/app/service-nav';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { CoinBalanceBadge } from '@/components/ui/coin-balance-badge';

export function SiteHeader() {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const { isAuthenticated } = useAuth();

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/75 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight shrink-0">
          {/* RRAASI Logo */}
          <Logo className="h-8 md:h-10" size="md" />
        </Link>

        {/* Desktop: Centered Nav */}
        <div className="flex-1 hidden md:flex justify-center">
          <ServiceNav variant="header" />
        </div>

        {/* Mobile: Vertical Side Dock (Expandable) */}
        <ServiceNav variant="vertical-dock" className="md:hidden" />

        <nav className="flex items-center gap-2 sm:gap-4 shrink-0">

          {isAuthenticated && (
            <>
              {/* Coin balance — click to top up */}
              <CoinBalanceBadge />

              <Link
                href="/profile"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                title={isHi ? 'प्रोफ़ाइल' : 'Profile'}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{isHi ? 'प्रोफ़ाइल' : 'Profile'}</span>
              </Link>
            </>
          )}
          <ThemeToggle className="w-auto" />
          <LanguageSelector />
          <LoginLink />
        </nav>
      </div >
    </header >
  );
}
