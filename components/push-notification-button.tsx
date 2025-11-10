'use client';

import { useState } from 'react';
import { toastAlert } from '@/components/livekit/alert-toast';
import { Button } from '@/components/livekit/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationButtonProps {
  className?: string;
}

/**
 * Button component to enable/disable push notifications.
 * Shows current subscription status and allows toggling.
 */
export function PushNotificationButton({ className }: PushNotificationButtonProps) {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } =
    usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toastAlert({
          title: 'Push Notifications',
          description: 'Push notifications disabled successfully',
        });
      } else {
        await subscribe();
        toastAlert({
          title: 'Push Notifications',
          description: 'Push notifications enabled successfully',
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to toggle push notifications';
      toastAlert({
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show different states based on permission
  if (permission === 'denied') {
    return (
      <div className={className}>
        <p className="muted-foreground text-sm">
          Push notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isLoading}
      variant={isSubscribed ? 'outline' : 'default'}
      className={className}
    >
      {isLoading
        ? 'Loading...'
        : isSubscribed
          ? '🔔 Push Notifications Enabled'
          : '🔕 Enable Push Notifications'}
    </Button>
  );
}
