'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';
import { useLanguage } from '@/contexts/language-context';
import { Logo } from '@/components/ui/logo';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, processEmailLink } = useAuth();
  const { t, language } = useLanguage();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const service = searchParams.get('service') || undefined;

  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [emailForLink, setEmailForLink] = useState('');
  const [requireEmailPrompt, setRequireEmailPrompt] = useState(false);

  // Magic Link Effect
  useEffect(() => {
    let isMounted = true;
    const processMagicLink = async () => {
      console.log('[DEBUG] processMagicLink started');
      try {
        const { isSignInWithEmailLink } = await import('firebase/auth');
        const auth = getFirebaseAuth();
        console.log('[DEBUG] Checking if it is a magic link URL...');
        if (isSignInWithEmailLink(auth, window.location.href)) {
          console.log('[DEBUG] Yes, it is a magic link. Setting linkLoading(true)');
          setLinkLoading(true);
          let email = window.localStorage.getItem('emailForSignIn');
          console.log('[DEBUG] Retrieved email from localStorage:', email);
          if (!email) {
            console.log('[DEBUG] Email not found, prompting user...');
            if (isMounted) setRequireEmailPrompt(true);
            return;
          }
          console.log('[DEBUG] Calling processEmailLink...');
          await processEmailLink(email, window.location.href);
          console.log('[DEBUG] processEmailLink completed. Pushing router...');
          router.push(returnUrl);
        } else {
          console.log('[DEBUG] Not a magic link URL.');
        }
      } catch (err: unknown) {
        console.error('Error processing magic link:', err);
        if (isMounted) setLinkError('Link expired or invalid. Please request a new one.');
      } finally {
        console.log('[DEBUG] finally block executing. isMounted:', isMounted, 'requireEmailPrompt:', requireEmailPrompt);
        if (isMounted && !requireEmailPrompt) setLinkLoading(false);
      }
    };

    processMagicLink();
    return () => {
      isMounted = false;
    };
  }, [processEmailLink, router, returnUrl, requireEmailPrompt]);

  const handleManualEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkLoading(true);
    setLinkError(null);
    try {
      await processEmailLink(emailForLink, window.location.href);
      router.push(returnUrl);
    } catch (err: unknown) {
      console.error('Error processing magic link with manual email:', err);
      setLinkError('Failed to verify email. Please try again or request a new link.');
      setLinkLoading(false);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && !linkLoading && !requireEmailPrompt) {
      router.push(returnUrl);
    }
  }, [isAuthenticated, authLoading, returnUrl, router, linkLoading, requireEmailPrompt]);

  const handleLoginSuccess = () => {
    // Small delay to ensure auth state is updated
    setTimeout(() => {
      router.push(returnUrl);
    }, 100);
  };

  if (authLoading || linkLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground text-center">
          <div className="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent mx-auto"></div>
          <p>{language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !requireEmailPrompt) {
    return null; // Will redirect via useEffect
  }

  if (requireEmailPrompt) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-md bg-card border-border rounded-2xl border p-4 shadow-xl sm:p-6">
          <Logo size="lg" className="justify-center mx-auto flex mb-6" />
          <h2 className="text-foreground text-2xl font-bold text-center mb-2">
            {language === 'hi' ? 'ईमेल की पुष्टि करें' : 'Confirm your email'}
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {language === 'hi'
              ? 'पूरा करने के लिए कृपया अपना ईमेल पता प्रदान करें।'
              : 'Please provide your email address to complete the sign-in.'}
          </p>
          
          {linkError && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 mb-4 rounded-lg border p-3 text-sm">
              {linkError}
            </div>
          )}

          <form onSubmit={handleManualEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="emailForLink" className="text-foreground mb-2 block text-sm font-medium">
                {language === 'hi' ? 'ईमेल पता' : 'Email Address'}
              </label>
              <input
                id="emailForLink"
                type="email"
                value={emailForLink}
                onChange={(e) => setEmailForLink(e.target.value)}
                placeholder="you@example.com"
                className="border-input bg-background text-foreground focus:ring-ring h-12 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none sm:text-base"
                required
              />
            </div>
            <Button type="submit" className="h-12 w-full text-base">
              {language === 'hi' ? 'पुष्टि करें' : 'Confirm'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo size="lg" className="justify-center mx-auto flex" />
          <p className="text-muted-foreground mt-2 text-sm">{t('auth.loginSuccess')}</p>
        </div>
        
        {linkError && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 mb-4 rounded-lg border p-3 text-sm">
            {linkError}
          </div>
        )}

        <PhoneAuthForm onSuccess={handleLoginSuccess} service={service} />
        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-xs">{t('auth.loginSuccess')}</p>
        </div>
      </div>
    </div>
  );
}
