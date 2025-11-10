import { useEffect, useState, useCallback } from 'react';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  error: string | null;
}

/**
 * Hook to manage push notifications for the web app.
 * Handles subscription, permission requests, and subscription state.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    subscription: null,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    const permission = Notification.permission;

    setState((prev) => ({
      ...prev,
      isSupported,
      permission,
    }));

    // Check existing subscription
    if (isSupported) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setState((prev) => ({
        ...prev,
        isSubscribed: !!subscription,
        subscription,
        error: null,
      }));
    } catch (error) {
      console.error('[PushNotifications] Error checking subscription:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to check subscription',
      }));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      const error = 'Push notifications are not supported in this browser';
      setState((prev) => ({ ...prev, error }));
      throw new Error(error);
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to request permission';
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, [state.isSupported]);

  const subscribe = useCallback(async (): Promise<PushSubscription> => {
    if (!state.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (state.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment or use a default
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local');
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      try {
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save subscription on server');
        }
      } catch (error) {
        console.error('[PushNotifications] Failed to save subscription:', error);
        // Don't throw - subscription is still valid locally
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        subscription,
        error: null,
      }));

      return subscription;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to subscribe';
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, [state.isSupported, state.permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify server
        try {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription,
            }),
          });
        } catch (error) {
          console.error('[PushNotifications] Failed to notify server of unsubscribe:', error);
        }

        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          subscription: null,
          error: null,
        }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}

/**
 * Convert a base64 URL-safe string to a Uint8Array.
 * This is needed for the VAPID public key.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

