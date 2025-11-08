# Quick Firebase Setup Guide

## Current Issue: Invalid API Key

The error `auth/invalid-api-key` means you need to configure your Firebase web app credentials.

## Steps to Fix:

### 1. Get Firebase Web App Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **satsang-afbf9**
3. Click the **gear icon** (⚙️) → **Project settings**
4. Scroll down to **"Your apps"** section
5. If you see a web app (</> icon), click on it
6. If no web app exists:
   - Click **"Add app"** → Select **Web** (</> icon)
   - Register app (you can name it "Satsang Web")
   - Copy the config values

### 2. Copy These Values

You'll see something like:

```javascript
const firebaseConfig = {
  apiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  authDomain: 'satsang-afbf9.firebaseapp.com',
  projectId: 'satsang-afbf9',
  appId: '1:123456789:web:abcdef123456',
};
```

### 3. Create `.env.local` File

In the **root directory** of your project (`/Users/prakash/Documents/satsang/satsangapp/`), create or update `.env.local`:

```bash
# Firebase Web App Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=satsang-afbf9.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Auth Server URL (for Next.js API proxy)
AUTH_SERVER_URL=http://localhost:4000
```

**Replace the values with your actual Firebase config values!**

### 4. Restart Frontend Server

After adding the environment variables:

```bash
# Stop the current frontend server (Ctrl+C)
# Then restart it:
pnpm dev
```

### 5. Verify Phone Auth is Enabled

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Make sure **Phone** provider is **Enabled**
3. If not, click on Phone → Enable → Save

## Test Credentials

Once configured, you can test with:

- Phone: `+91 84540 83097`
- OTP: `123456` (Firebase test OTP)

## Troubleshooting

### Still getting "invalid-api-key"?

- Make sure `.env.local` is in the **root** directory (not in `auth-server/`)
- Restart the Next.js dev server after adding env vars
- Check that the API key starts with `AIzaSy` (Firebase API keys always start with this)

### Auth server connection issues?

- Auth server should be running on port 4000
- Check: `curl http://localhost:4000/auth/health` should return `{"ok":true}`
