'use client';

import React, { useEffect, useState } from 'react';
import { toastAlert } from '@/components/livekit/alert-toast';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useAuth } from './auth-provider';
import { PhoneAuthForm } from './phone-auth-form';

interface SessionAuthGuardProps {
  children: React.ReactNode;
  isSessionActive: boolean;
}

/**
 * Guards session access after 15-minute free trial expires
 * Shows auth form when trial time is up, allows seamless continuation after auth
 */
export function SessionAuthGuard({ children, isSessionActive }: SessionAuthGuardProps) {
  const { isAuthenticated, loading, refreshUser } = useAuth();
  const { isTrialExpired, minutesRemaining, secondsRemaining, resetTimer } =
    useSessionTimer(isSessionActive);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  // Always log state for debugging
  console.log('[SessionAuthGuard] Render:', {
    isTrialExpired,
    isSessionActive,
    isAuthenticated,
    loading,
    minutesRemaining,
    secondsRemaining,
  });

  // Reset timer when user authenticates (they get unlimited access)
  useEffect(() => {
    if (isAuthenticated && isSessionActive) {
      resetTimer();
    }
  }, [isAuthenticated, isSessionActive, resetTimer]);

  // Show warning when 5 seconds remaining (for 10-sec test) or 2 minutes (for 15-min production)
  useEffect(() => {
    if (
      isSessionActive &&
      !isAuthenticated &&
      !isTrialExpired &&
      minutesRemaining === 0 &&
      secondsRemaining === 5 &&
      !hasShownWarning
    ) {
      setHasShownWarning(true);
      toastAlert({
        title: 'Free trial ending soon',
        description: '5 seconds remaining. Please sign up to continue your session.',
      });
    }
  }, [
    isSessionActive,
    isAuthenticated,
    isTrialExpired,
    minutesRemaining,
    secondsRemaining,
    hasShownWarning,
  ]);

  // Show warning when 2 seconds remaining
  useEffect(() => {
    if (
      isSessionActive &&
      !isAuthenticated &&
      !isTrialExpired &&
      minutesRemaining === 0 &&
      secondsRemaining === 2 &&
      hasShownWarning
    ) {
      toastAlert({
        title: 'Free trial ending soon',
        description: '2 seconds remaining. Please sign up to continue.',
      });
    }
  }, [
    isSessionActive,
    isAuthenticated,
    isTrialExpired,
    minutesRemaining,
    secondsRemaining,
    hasShownWarning,
  ]);

  // Show expiration message
  useEffect(() => {
    if (isSessionActive && !isAuthenticated && isTrialExpired) {
      toastAlert({
        title: 'Free trial expired',
        description: 'Please sign up to continue your session with Guruji.',
      });
    }
  }, [isSessionActive, isAuthenticated, isTrialExpired]);

  // If loading, show children (don't block)
  if (loading) {
    console.log('[SessionAuthGuard] Loading state - showing children');
    return <>{children}</>;
  }

  // For testing: Allow forcing trial check even when authenticated
  // Set localStorage.setItem('forceTrialCheck', 'true') to test trial expiration
  const forceTrialCheck =
    typeof window !== 'undefined' && localStorage.getItem('forceTrialCheck') === 'true';

  // If authenticated, always allow access (bypass trial) - unless forced for testing
  if (isAuthenticated && !forceTrialCheck) {
    console.log('[SessionAuthGuard] Authenticated - bypassing trial, showing children');
    return <>{children}</>;
  }

  if (forceTrialCheck) {
    console.log('[SessionAuthGuard] ⚠️ TEST MODE: Forcing trial check even though authenticated');
  }

  // If trial expired AND (user is NOT authenticated OR test mode is enabled), show auth form overlay
  // Note: Authenticated users bypass the trial (they get unlimited access) unless test mode is enabled
  const shouldShowOverlay =
    isTrialExpired && isSessionActive && (!isAuthenticated || forceTrialCheck);

  console.log('[SessionAuthGuard] Checking expiration:', {
    isTrialExpired,
    isSessionActive,
    isAuthenticated,
    forceTrialCheck,
    willShowOverlay: shouldShowOverlay,
  });

  if (shouldShowOverlay) {
    console.log('[SessionAuthGuard] ✅✅✅ SHOWING AUTH OVERLAY - ALL CONDITIONS MET!');
    return (
      <div className="relative h-full w-full">
        {/* Blurred background */}
        <div className="absolute inset-0 blur-sm">{children}</div>

        {/* Auth overlay */}
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md">
            <div className="mb-4 rounded-lg bg-white p-4 text-center shadow-lg">
              <h2 className="mb-2 text-xl font-bold text-gray-900">Free Trial Ended</h2>
              <p className="mb-4 text-sm text-gray-600">
                Your free trial has ended. Please sign up to continue your session with Guruji.
              </p>
            </div>
            <PhoneAuthForm
              onSuccess={async () => {
                // Refresh auth state to ensure isAuthenticated is updated
                await refreshUser();
                // Reset timer since user is now authenticated
                resetTimer();
                console.log(
                  '[SessionAuthGuard] Authentication successful - overlay should disappear'
                );
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Trial still active, show children with optional timer indicator
  return <>{children}</>;
}
