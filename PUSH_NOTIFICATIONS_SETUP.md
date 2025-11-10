# Push Notifications Setup Guide

This guide explains how to set up push notifications for the Satsang web app.

## Overview

Push notifications allow the app to send notifications to users even when the app is not open. This is useful for:
- Notifying users about new satsang sessions
- Reminding users about upcoming events
- Sending important updates

## Prerequisites

1. **HTTPS Required**: Push notifications only work over HTTPS (or localhost for development)
2. **Service Worker**: Already configured in `/public/sw.js`
3. **VAPID Keys**: Need to generate and configure

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

### Option 1: Using the provided script

```bash
node scripts/generate-vapid-keys.js
```

This will output:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Add to `.env.local`
- `VAPID_PRIVATE_KEY` - Add to server-side `.env` (keep secret!)

### Option 2: Using web-push library

```bash
npm install -g web-push
web-push generate-vapid-keys
```

## Step 2: Configure Environment Variables

### Frontend (.env.local)

Add the public key:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
```

### Backend/Server (.env)

Add the private key (keep this secret!):

```env
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

The `VAPID_SUBJECT` should be a mailto: URL or a website URL that identifies your app.

## Step 3: Update Subscription Storage

The current implementation in `/app/api/push/subscribe/route.ts` only logs subscriptions. For production, you need to:

1. **Store subscriptions in a database** (e.g., PostgreSQL, MongoDB)
2. **Associate subscriptions with user IDs**
3. **Handle subscription updates**

Example database schema:

```sql
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Step 4: Sending Push Notifications

To send push notifications from your backend, use the `web-push` library:

```bash
npm install web-push
```

Example code to send a notification:

```typescript
import webpush from 'web-push';

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Get subscription from database
const subscription = {
  endpoint: '...',
  keys: {
    p256dh: '...',
    auth: '...',
  },
};

// Send notification
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'नया सत्संग सत्र',
  body: 'एक नया सत्संग सत्र शुरू हो रहा है',
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  url: '/',
}));
```

## Step 5: Testing

1. **Build and start the app**:
   ```bash
   pnpm build
   pnpm start
   ```

2. **Open the app** in a browser (HTTPS or localhost)

3. **Click "Enable Push Notifications"** button on the welcome page

4. **Grant permission** when browser prompts

5. **Test sending a notification** using the web-push library or a tool like [web-push-testing](https://web-push-testing.herokuapp.com/)

## Features

- ✅ Service worker handles push events
- ✅ Notifications show with Hindi text
- ✅ Clicking notification opens the app
- ✅ Notification actions (Open/Close)
- ✅ Subscription management (subscribe/unsubscribe)
- ✅ Permission handling

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 16.4+, macOS)
- ❌ Safari (older versions - no web push support)

## Security Notes

1. **Never expose VAPID_PRIVATE_KEY** in frontend code
2. **Always use HTTPS** in production
3. **Validate subscription endpoints** before sending
4. **Rate limit** push notification sending
5. **Handle subscription expiration** (subscriptions can expire)

## Troubleshooting

### Notifications not showing

1. Check browser console for errors
2. Verify service worker is registered: `navigator.serviceWorker.getRegistration()`
3. Check notification permission: `Notification.permission`
4. Verify VAPID keys are correct

### Subscription fails

1. Check VAPID public key is set in `.env.local`
2. Verify the key format (should be URL-safe base64)
3. Check browser console for errors

### Notifications not received

1. Verify subscription is saved in database
2. Check VAPID keys match (public key in frontend, private key on server)
3. Ensure `VAPID_SUBJECT` is set correctly
4. Check server logs for errors when sending

## Next Steps

1. Implement database storage for subscriptions
2. Create admin panel to send notifications
3. Add notification preferences (users can choose what to receive)
4. Implement notification scheduling
5. Add analytics for notification delivery

