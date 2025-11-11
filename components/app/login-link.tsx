'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

export function LoginLink() {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const returnUrl = pathname || '/';

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <LogoutButton variant="secondary" size="sm" className="text-xs sm:text-sm" />;
  }

  return (
    <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}>
      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
        <span className="hidden sm:inline">{t('common.login')}</span>
        <span className="sm:hidden">{t('common.login')}</span>
      </Button>
    </Link>
  );
}
