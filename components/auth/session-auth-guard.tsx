'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRoomContext } from '@livekit/components-react';
import { toastAlert } from '@/components/livekit/alert-toast';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useAuth } from './auth-provider';

interface SessionAuthGuardProps {
  children: React.ReactNode;
  isSessionActive: boolean;
}

/**
 * Guards session access after 15-minute free trial expires
 * Redirects to login page when trial time is up
 */
export function SessionAuthGuard({ children, isSessionActive }: SessionAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const room = useRoomContext();
  const { isAuthenticated, loading } = useAuth();
  const { isTrialExpired, minutesRemaining, secondsRemaining, resetTimer } =
    useSessionTimer(isSessionActive);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

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

  // Redirect to login when trial expires
  useEffect(() => {
    if (isSessionActive && !isAuthenticated && isTrialExpired && !hasRedirected && !loading) {
      setHasRedirected(true);

      // Disconnect room before redirecting
      if (room && room.state !== 'disconnected') {
        room.disconnect();
      }

      // Show toast notification
      toastAlert({
        title: 'Free trial expired',
        description: 'Please login to continue your session with Guruji.',
      });

      // Redirect to login page with return URL
      const returnUrl = pathname || '/(app)';
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [
    isSessionActive,
    isAuthenticated,
    isTrialExpired,
    hasRedirected,
    loading,
    router,
    pathname,
    room,
  ]);

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

  // If trial expired and we're redirecting, show loading state
  if (isTrialExpired && isSessionActive && !isAuthenticated && hasRedirected) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Trial still active, show children with optional timer indicator
  return <>{children}</>;
}
