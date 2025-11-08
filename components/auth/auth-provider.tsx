'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
// eslint-disable-next-line import/named
import type { ConfirmationResult } from 'firebase/auth';
// eslint-disable-next-line import/named
import { signInWithPhoneNumber } from 'firebase/auth';
import { type UserInfo, getCurrentUser, sessionLogin, sessionLogout } from '@/lib/auth-api';
import { getFirebaseAuth, getRecaptchaVerifier } from '@/lib/firebase-client';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  sendOTP: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<unknown>(null);

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    let verifier: unknown = null;
    getRecaptchaVerifier()
      .then((v: unknown) => {
        verifier = v;
        setRecaptchaVerifier(verifier);
      })
      .catch(() => {
        // Error already logged in getRecaptchaVerifier
      });

    return () => {
      // Cleanup reCAPTCHA verifier
      if (verifier) {
        try {
          if (
            typeof verifier === 'object' &&
            verifier !== null &&
            'clear' in verifier &&
            typeof (verifier as { clear?: unknown }).clear === 'function'
          ) {
            (verifier as { clear: () => void }).clear();
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const userInfo = await getCurrentUser();
      setUser(userInfo);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication status on mount and on window focus (handles page refresh)
  useEffect(() => {
    checkAuth();

    // Also check auth when window regains focus (handles tab switching and page refresh)
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAuth]);

  const sendOTP = useCallback(
    async (phoneNumber: string): Promise<ConfirmationResult> => {
      const auth = getFirebaseAuth();

      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      // Normalize phone number
      const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      try {
        // @ts-expect-error - Firebase v12 types - recaptchaVerifier is ApplicationVerifier but typed as unknown
        const confirmationResult = await signInWithPhoneNumber(auth, normalized, recaptchaVerifier);
        return confirmationResult;
      } catch (err: unknown) {
        console.error('Error sending OTP:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
        throw new Error(errorMessage);
      }
    },
    [recaptchaVerifier]
  );

  const verifyOTP = useCallback(
    async (confirmationResult: ConfirmationResult, code: string): Promise<void> => {
      try {
        // Verify the OTP code
        const result = await confirmationResult.confirm(code);
        const idToken = await result.user.getIdToken();

        // Exchange ID token for session cookie
        await sessionLogin(idToken);

        // Refresh user info
        await checkAuth();
      } catch (err: unknown) {
        console.error('Error verifying OTP:', err);
        const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
        throw new Error(errorMessage);
      }
    },
    [checkAuth]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await sessionLogout();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    await checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        sendOTP,
        verifyOTP,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
