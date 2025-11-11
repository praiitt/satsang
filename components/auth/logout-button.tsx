'use client';

import React from 'react';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from './auth-provider';

interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LogoutButton({
  className,
  variant = 'secondary',
  size = 'default',
}: LogoutButtonProps) {
  const { logout, loading } = useAuth();
  const { t } = useLanguage();
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
      size={size}
      className={className}
    >
      {isLoggingOut ? `${t('common.logout')}...` : t('common.logout')}
    </Button>
  );
}
