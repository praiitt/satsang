'use client';

import React from 'react';
import { useAuth } from './auth-provider';
import { PhoneAuthForm } from './phone-auth-form';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || <PhoneAuthForm />;
  }

  return <>{children}</>;
}
