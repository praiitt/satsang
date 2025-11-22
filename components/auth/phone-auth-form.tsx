'use client';

/* eslint-disable prettier/prettier */
import React, { useEffect, useRef, useState } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { toastAlert } from '@/components/livekit/alert-toast';
import { Button } from '@/components/livekit/button';
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
}

export function PhoneAuthForm({ onSuccess, className }: PhoneAuthFormProps) {
  const { sendOTP, verifyOTP } = useAuth();
  const { t, language } = useLanguage();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSupported, setOtpSupported] = useState(false);
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

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError(null);
    confirmationResultRef.current = null;
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

        {step === 'phone' ? (
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
                      <span className="text-muted-foreground shrink-0">({selectedCountry.dialCode})</span>
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
        ) : (
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
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={loading}
                className="h-12 flex-1"
              >
                {t('auth.back')}
              </Button>
              <Button type="submit" disabled={loading} className="h-12 flex-1">
                {loading ? t('auth.verifying') : t('auth.verify')}
              </Button>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground w-full text-sm underline"
            >
              {t('auth.resend')}
            </button>
          </form>
        )}
      </div>

      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-container" />
    </div>
  );
}
