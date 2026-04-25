'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  processEmailLink: (email: string, emailLink: string) => Promise<void>;
  signInWithEmailPwd: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
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
    console.log('[DEBUG-AUTH] checkAuth started');
    try {
      console.log('[DEBUG-AUTH] Calling getCurrentUser()');
      const userInfo = await getCurrentUser();
      console.log('[DEBUG-AUTH] getCurrentUser returned:', userInfo ? userInfo.uid : 'null');
      setUser(userInfo);
    } catch (error) {
      console.error('[DEBUG-AUTH] checkAuth failed:', error);
      setUser(null);
    } finally {
      console.log('[DEBUG-AUTH] checkAuth finally block executing. Setting loading to false.');
      setLoading(false);
    }
  }, []);

  // Check authentication status on mount only (no polling)
  useEffect(() => {
    console.log('[DEBUG-AUTH] AuthProvider mounted. Calling checkAuth().');
    checkAuth();
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

  const sendEmailLink = useCallback(async (email: string): Promise<void> => {
    try {
      const auth = getFirebaseAuth();
      const { sendSignInLinkToEmail } = await import('firebase/auth');

      const actionCodeSettings = {
        // URL you want to redirect back to. Ensure it's in the authorized domains list.
        url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email locally so you don't need to ask the user for it again
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('emailForSignIn', email);
      }
    } catch (error: any) {
      console.error('Error sending email link:', error);
      throw new Error(error.message || 'Failed to send login link');
    }
  }, []);

  const processEmailLink = useCallback(async (email: string, emailLink: string): Promise<void> => {
    console.log('[DEBUG] processEmailLink start for email:', email);
    try {
      const auth = getFirebaseAuth();
      const { signInWithEmailLink } = await import('firebase/auth');

      console.log('[DEBUG] calling signInWithEmailLink...');
      const result = await signInWithEmailLink(auth, email, emailLink);
      console.log('[DEBUG] signInWithEmailLink resolved. Getting idToken...');
      const idToken = await result.user.getIdToken();

      // Exchange for session cookie
      console.log('[DEBUG] Exchanging for session cookie with API...');
      await sessionLogin(idToken);
      console.log('[DEBUG] session cookie exchanged successfully.');

      // Refresh user
      console.log('[DEBUG] Calling checkAuth...');
      await checkAuth();
      console.log('[DEBUG] checkAuth completed in processEmailLink.');

      // Clear email from storage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('emailForSignIn');
      }
    } catch (error: any) {
      console.error('Error signing in with email link:', error);
      throw new Error(error.message || 'Failed to sign in with email link');
    }
  }, [checkAuth]);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      const auth = getFirebaseAuth();
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Exchange for session cookie
      await sessionLogin(idToken);

      // Refresh user
      await checkAuth();
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }, [checkAuth]);

  const signInWithFacebook = useCallback(async (): Promise<void> => {
    try {
      const auth = getFirebaseAuth();
      const { FacebookAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new FacebookAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Exchange for session cookie
      await sessionLogin(idToken);

      // Refresh user
      await checkAuth();
    } catch (error: any) {
      console.error('Error signing in with Facebook:', error);
      throw new Error(error.message || 'Failed to sign in with Facebook');
    }
  }, [checkAuth]);

  const signInWithEmailPwd = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      const auth = getFirebaseAuth();
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();

      // Exchange for session cookie
      await sessionLogin(idToken);

      // Refresh user
      await checkAuth();
    } catch (error: any) {
      console.error('Error signing in with email and password:', error);
      throw new Error(error.message || 'Failed to sign in with email and password');
    }
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        sendOTP,
        verifyOTP,
        signInWithGoogle,
        signInWithFacebook,
        sendEmailLink,
        processEmailLink,
        signInWithEmailPwd,
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
