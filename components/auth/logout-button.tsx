'use client';

import React from 'react';
import { Button } from '@/components/livekit/button';
import { useAuth } from './auth-provider';

interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'secondary';
}

export function LogoutButton({ className, variant = 'secondary' }: LogoutButtonProps) {
  const { logout, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={loading || isLoggingOut}
      variant={variant}
      className={className}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
}
