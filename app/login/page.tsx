'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';
import { useLanguage } from '@/contexts/language-context';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push(returnUrl);
    }
  }, [isAuthenticated, loading, returnUrl, router]);

  const handleLoginSuccess = () => {
    // Small delay to ensure auth state is updated
    setTimeout(() => {
      router.push(returnUrl);
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground text-center">
          <div className="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-3xl">🕉️</span>
          </div>
          <h1 className="text-foreground text-3xl font-bold">RRAASI</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t('auth.loginSuccess')}</p>
        </div>
        <PhoneAuthForm onSuccess={handleLoginSuccess} />
        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-xs">{t('auth.loginSuccess')}</p>
        </div>
      </div>
    </div>
  );
}
