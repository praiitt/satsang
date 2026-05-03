'use client';

/* eslint-disable prettier/prettier */
import React, { useEffect, useRef, useState } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { toastAlert } from '@/components/livekit/alert-toast';
import { Button } from '@/components/livekit/button';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { triggerMarketingWelcome } from '@/lib/auth-api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/livekit/select';
import { useLanguage } from '@/contexts/language-context';
import { type Country, DEFAULT_COUNTRY, countries } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { useAuth } from './auth-provider';

interface PhoneAuthFormProps {
  onSuccess?: () => void;
  className?: string;
  service?: string;
}

export function PhoneAuthForm({ onSuccess, className, service }: PhoneAuthFormProps) {
  const { sendOTP, verifyOTP, signInWithGoogle, signInWithFacebook, sendEmailLink, signInWithEmailPwd } = useAuth();
  const { t, language } = useLanguage();
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [otpSupported, setOtpSupported] = useState(false);
  const [password, setPassword] = useState('EarlyFreeAccess');
  const [emailAuthMethod, setEmailAuthMethod] = useState<'password' | 'link'>('password');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePwdCurrentPwd, setChangePwdCurrentPwd] = useState('');
  const [changePwdNew, setChangePwdNew] = useState('');
  const [changePwdConfirm, setChangePwdConfirm] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [changePwdError, setChangePwdError] = useState<string | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Check if WebOTP API is supported
  useEffect(() => {
    if ('OTPCredential' in window) {
      setOtpSupported(true);
    }
  }, []);

  // Auto-detect OTP from SMS when on OTP step
  useEffect(() => {
    if (step === 'otp' && otpSupported && 'OTPCredential' in window) {
      const abortController = new AbortController();

      // Request OTP from SMS
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator.credentials as any)
        .get({
          otp: { transport: ['sms'] },
          signal: abortController.signal,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((otp: any) => {
          if (otp && otp.code) {
            setOtpCode(otp.code);
            // Auto-submit if we have confirmation result
            if (confirmationResultRef.current) {
              handleAutoVerify(otp.code);
            }
          }
        })
        .catch((err: unknown) => {
          // User cancelled or OTP not received yet - this is normal
          console.log('OTP auto-detection:', err);
        });

      return () => {
        abortController.abort();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, otpSupported]);

  const handleAutoVerify = async (code: string) => {
    if (!confirmationResultRef.current) return;

    setLoading(true);
    setError(null);

    try {
      await verifyOTP(confirmationResultRef.current, code);
      toastAlert({
        title: 'Success!',
        description: 'You have been logged in successfully.',
      });
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate phone number (without country code)
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      // Combine country code with phone number
      const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;

      const result = await sendOTP(fullPhoneNumber);
      confirmationResultRef.current = result;
      setStep('otp');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!confirmationResultRef.current) {
        throw new Error('OTP session expired. Please try again.');
      }

      if (!otpCode || otpCode.length !== 6) {
        throw new Error('Please enter the 6-digit OTP code');
      }

      await verifyOTP(confirmationResultRef.current, otpCode);
      // Call onSuccess first to refresh auth state, then show toast
      // This ensures the overlay disappears before the toast appears
      if (onSuccess) {
        await onSuccess();
      }

      // Trigger Marketing Welcome (Fire and Forget)
      const currentUser = getFirebaseAuth().currentUser;
      if (currentUser && service) {
        triggerMarketingWelcome({
          userId: currentUser.uid,
          phone: currentUser.phoneNumber || undefined,
          email: currentUser.email || undefined,
          serviceOfInterest: service,
        });
      }

      toastAlert({
        title: 'Success!',
        description: 'You have been logged in successfully.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      await signInWithEmailPwd(email, password);
      // Call onSuccess first to refresh auth state
      if (onSuccess) {
        await onSuccess();
      }

      // Trigger Marketing Welcome
      const currentUser = getFirebaseAuth().currentUser;
      if (currentUser && service) {
        triggerMarketingWelcome({
          userId: currentUser.uid,
          phone: currentUser.phoneNumber || undefined,
          email: currentUser.email || undefined,
          serviceOfInterest: service,
        });
      }

      toastAlert({
        title: 'Success!',
        description: 'You have been logged in successfully.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailAuthMethod === 'password') {
      return handleEmailPasswordAuth(e);
    }
    
    setError(null);
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter your email address');
      }

      await sendEmailLink(email);
      setEmailSent(true);

      toastAlert({
        title: 'Email Sent!',
        description: 'Check your inbox for the magic link to log in.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError(null);
    confirmationResultRef.current = null;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwdError(null);

    if (!changePwdNew || changePwdNew.length < 6) {
      setChangePwdError('New password must be at least 6 characters');
      return;
    }
    if (changePwdNew !== changePwdConfirm) {
      setChangePwdError('Passwords do not match');
      return;
    }

    setChangePwdLoading(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Not logged in');

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, changePwdCurrentPwd);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, changePwdNew);

      toastAlert({ title: 'Password Updated!', description: 'Your password has been changed successfully.' });
      setShowChangePassword(false);
      setChangePwdCurrentPwd('');
      setChangePwdNew('');
      setChangePwdConfirm('');
    } catch (err: unknown) {
      const msg = (err as any)?.code === 'auth/wrong-password'
        ? 'Current password is incorrect'
        : err instanceof Error ? err.message : 'Failed to change password';
      setChangePwdError(msg);
    } finally {
      setChangePwdLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError(null);
    setLoading(true);

    try {
      // Re-construct full phone number
      const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;

      const result = await sendOTP(fullPhoneNumber);
      confirmationResultRef.current = result;

      toastAlert({
        title: t('auth.codeResent') || 'Code sent',
        description: t('auth.codeResentDesc') || 'A new verification code has been sent to your phone.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend OTP';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('mx-auto w-full max-w-md px-4', className)}>
      <div className="bg-card border-border rounded-2xl border p-4 shadow-xl sm:p-6">
        <div className="mb-6 text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-foreground text-2xl font-bold">
            {step === 'phone' ? t('auth.welcome') : t('auth.verifyNumber')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {step === 'phone' ? t('auth.enterPhone') : t('auth.codeSent')}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 mb-4 rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        {/* ── Social Login — shown first on the phone entry step ── */}
        {step === 'phone' && (
          <>
            <div className="grid grid-cols-1 gap-3 mb-6">
              <Button
                variant="outline"
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    await signInWithGoogle();
                    toastAlert({ title: 'Success!', description: 'You have been logged in successfully.' });
                    onSuccess?.();
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed';
                    setError(errorMessage);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Google
              </Button>

              <Button
                variant="outline"
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    await signInWithFacebook();
                    toastAlert({ title: 'Success!', description: 'You have been logged in successfully.' });
                    onSuccess?.();
                  } catch (err: unknown) {
                    console.error('Facebook login error:', err);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const errorCode = (err as any)?.code;
                    const errorMessage = err instanceof Error ? err.message : 'Facebook sign-in failed.';
                    if (errorCode === 'auth/account-exists-with-different-credential') {
                      setError("An account already exists with the same email. Please sign in with Google or Email.");
                    } else if (errorCode === 'auth/popup-closed-by-user') {
                      setError(null);
                    } else {
                      setError(`Login failed: ${errorMessage}`);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                Facebook
              </Button>
            </div>

            {/* OR divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card text-muted-foreground px-2">
                  {language === 'hi' ? 'या' : 'Or continue with'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Phone / Email form ── */}
        {step === 'phone' && authMode === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label htmlFor="country" className="text-foreground mb-2 block text-sm font-medium">
                {language === 'hi' ? 'देश' : 'Country'}
              </label>
              <Select value={selectedCountry.code} onValueChange={handleCountryChange}>
                <SelectTrigger className="h-12 w-full rounded-lg">
                  <SelectValue>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0">{selectedCountry.flag}</span>
                      <span className="min-w-0 truncate">
                        {language === 'hi' ? selectedCountry.nameHindi : selectedCountry.name}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        ({selectedCountry.dialCode})
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{language === 'hi' ? country.nameHindi : country.name}</span>
                        <span className="text-muted-foreground">({country.dialCode})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="phone" className="text-foreground mb-2 block text-sm font-medium">
                {t('auth.phoneNumber')}
              </label>
              <div className="relative flex min-w-0">
                <div className="border-input bg-muted text-foreground flex shrink-0 items-center rounded-l-lg border border-r-0 px-3 text-sm sm:px-4 sm:text-base">
                  {selectedCountry.dialCode}
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder={language === 'hi' ? '9876543210' : '9876543210'}
                  className="border-input bg-background text-foreground focus:ring-ring h-12 min-w-0 flex-1 rounded-r-lg border px-3 text-sm focus:ring-2 focus:outline-none sm:px-4 sm:text-base"
                  required
                  disabled={loading}
                  autoComplete="tel-national"
                  inputMode="numeric"
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {language === 'hi'
                  ? `देश कोड ${selectedCountry.dialCode} स्वचालित रूप से जोड़ा जाएगा`
                  : `Country code ${selectedCountry.dialCode} will be added automatically`}
              </p>
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full text-base">
              {loading ? t('auth.sending') : t('auth.sendOTP')}
            </Button>
          </form>
        ) : step === 'phone' && authMode === 'email' ? (
          emailSent ? (
            <div className="text-center space-y-4 py-4">
              <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">
                {language === 'hi' ? 'लिंक भेजा गया!' : 'Link Sent!'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {language === 'hi'
                  ? 'हमने आपको एक मैजिक लिंक भेजा है। लॉग इन करने के लिए अपने ईमेल की जांच करें और उस पर क्लिक करें।'
                  : "We've sent a magic link to your email. Check your inbox and click it to log in."}
              </p>
              <Button onClick={() => setEmailSent(false)} variant="outline" className="mt-4">
                {language === 'hi' ? 'फिर से कोशिश करें' : 'Try another email'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-foreground mb-2 block text-sm font-medium">
                  {language === 'hi' ? 'ईमेल पता' : 'Email Address'}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-input bg-background text-foreground focus:ring-ring h-12 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none sm:text-base"
                  required
                  disabled={loading}
                />
              </div>

              {emailAuthMethod === 'password' && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor="password" className="text-foreground block text-sm font-medium">
                      {language === 'hi' ? 'पासवर्ड' : 'Password'}
                    </label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-input bg-background text-foreground focus:ring-ring h-12 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none sm:text-base"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-12 w-full text-base">
                {loading
                  ? (language === 'hi' ? 'लॉग इन हो रहा है...' : 'Logging in...')
                  : emailAuthMethod === 'password'
                    ? (language === 'hi' ? 'लॉग इन करें' : 'Login')
                    : (language === 'hi' ? 'मैजिक लिंक भेजें' : 'Send Magic Link')}
              </Button>

              <div className="text-center pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setEmailAuthMethod(prev => prev === 'password' ? 'link' : 'password')}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold border-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {emailAuthMethod === 'password' 
                    ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {language === 'hi' ? 'पासवर्ड के बिना लॉगिन करें' : 'Login without password'}
                      </>
                    )
                    : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {language === 'hi' ? 'पासवर्ड के साथ लॉगिन करें' : 'Login with password'}
                      </>
                    )}
                </button>
              </div>
            </form>
          )
        ) : (
          // OTP verify step
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="otp" className="text-foreground mb-2 block text-sm font-medium">
                {t('auth.enterOTP')}
              </label>
              <input
                ref={otpInputRef}
                id="otp"
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="border-input bg-background text-foreground focus:ring-ring h-14 w-full rounded-lg border px-4 text-center text-3xl tracking-[0.5em] focus:ring-2 focus:outline-none"
                required
                disabled={loading}
                autoFocus
                autoComplete="one-time-code"
              />
              {otpSupported && (
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  {t('auth.autoDetect')}
                </p>
              )}
              <p className="text-muted-foreground mt-2 text-center text-xs">
                {t('auth.codeSentTo')} {selectedCountry.dialCode}
                {phoneNumber.replace(/(\d{2})\d+(\d{4})/, '$1****$2')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleBack} disabled={loading} className="h-12 flex-1">
                {t('auth.back')}
              </Button>
              <Button type="submit" disabled={loading} className="h-12 flex-1">
                {loading ? (t('auth.verifying') || 'Verifying...') : (t('auth.verify') || 'Verify')}
              </Button>
            </div>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground w-full text-sm underline disabled:opacity-50"
            >
              {t('auth.resend')}
            </button>
          </form>
        )}

        {/* Auth Mode Toggle (phone ↔ email) — only on entry step */}
        {step === 'phone' && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setAuthMode(authMode === 'phone' ? 'email' : 'phone'); setError(null); }}
              className="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
            >
              {authMode === 'phone'
                ? (language === 'hi' ? 'ईमेल से जारी रखें' : 'Continue with Email instead')
                : (language === 'hi' ? 'फ़ोन नंबर से जारी रखें' : 'Continue with Phone instead')}
            </button>
          </div>
        )}

        {/* Change Password (shown when on email+password mode) */}
        {step === 'phone' && authMode === 'email' && emailAuthMethod === 'password' && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => { setShowChangePassword(v => !v); setChangePwdError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center transition-colors"
            >
              {showChangePassword ? 'Cancel' : '🔑 Change Password'}
            </button>

            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-3 border border-border rounded-xl p-4 bg-muted/30">
                <p className="text-sm font-semibold text-foreground mb-1">Change Password</p>

                {changePwdError && (
                  <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-2 text-xs">
                    {changePwdError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Current Password</label>
                  <input
                    type="password"
                    value={changePwdCurrentPwd}
                    onChange={e => setChangePwdCurrentPwd(e.target.value)}
                    placeholder="Your current password"
                    className="border-input bg-background text-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
                    required
                    disabled={changePwdLoading}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">New Password</label>
                  <input
                    type="password"
                    value={changePwdNew}
                    onChange={e => setChangePwdNew(e.target.value)}
                    placeholder="Min 6 characters"
                    className="border-input bg-background text-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
                    required
                    disabled={changePwdLoading}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={changePwdConfirm}
                    onChange={e => setChangePwdConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    className="border-input bg-background text-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
                    required
                    disabled={changePwdLoading}
                  />
                </div>

                <Button type="submit" disabled={changePwdLoading} className="h-10 w-full text-sm">
                  {changePwdLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>


      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-container" />
    </div>
  );
}
