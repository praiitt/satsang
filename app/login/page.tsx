'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';
import { useLanguage } from '@/contexts/language-context';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const service = searchParams.get('service') || undefined;

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
          {/* Use the fixed round logo or just the new Logo component? User said global logo.
                Let's simplify to just the big Logo text for a cleaner look, OR
                use the Fixed Round Logo + Text.
                Let's use: Fixed Round Logo + Big Text Component
            */}
          {/* Round logo removed as per user request */}
          <Logo size="lg" className="justify-center mx-auto flex" />
          <p className="text-muted-foreground mt-2 text-sm">{t('auth.loginSuccess')}</p>
        </div>
        <PhoneAuthForm onSuccess={handleLoginSuccess} service={service} />
        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-xs">{t('auth.loginSuccess')}</p>
        </div>
      </div>
    </div>
  );
}
