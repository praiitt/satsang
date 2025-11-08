# Firebase Phone Authentication Setup

This document explains how to set up Firebase phone authentication for the Satsang app.

## Prerequisites

1. Firebase project: `satsang-afbf9` (already configured)
2. Service account JSON file: `satsangServiceAccount.json` (already provided)
3. Firebase Web App configuration

## Step 1: Get Firebase Web App Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `satsang-afbf9`
3. Go to Project Settings (gear icon) → General tab
4. Scroll down to "Your apps" section
5. If no web app exists, click "Add app" → Web (</> icon)
6. Copy the Firebase configuration object

## Step 2: Enable Phone Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Phone** provider
3. Configure reCAPTCHA (Firebase handles this automatically for web)

## Step 3: Environment Variables

### Frontend (.env.local or .env)

```bash
# Firebase Web App Config (from Step 1)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=satsang-afbf9.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Auth Server URL (optional, defaults to /api/auth proxy)
NEXT_PUBLIC_AUTH_SERVER_URL=/api/auth

# Auth Server URL for Next.js API proxy (backend)
AUTH_SERVER_URL=http://localhost:4000
```

### Auth Server (auth-server/.env)

```bash
# Port for auth server
PORT=4000

# CORS origin (comma-separated for multiple origins)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Path to service account JSON (optional, defaults to ../satsangServiceAccount.json)
FIREBASE_SERVICE_ACCOUNT_PATH=../satsangServiceAccount.json
```

## Step 4: Install Dependencies

### Frontend

```bash
pnpm install
```

### Auth Server

```bash
cd auth-server
pnpm install  # or npm install
```

## Step 5: Start the Services

### Development

**Terminal 1 - Auth Server:**

```bash
cd auth-server
pnpm dev
```

**Terminal 2 - Frontend:**

```bash
pnpm dev
```

### Production

**Auth Server:**

```bash
cd auth-server
pnpm build
pnpm start
```

**Frontend:**

```bash
pnpm build
pnpm start
```

Or use PM2 (see `ecosystem.config.cjs` for configuration).

## Architecture

### Flow Diagram

```
User → Frontend (Firebase SDK) → Firebase Auth → ID Token
  ↓
Frontend → Next.js API Route (/api/auth/sessionLogin)
  ↓
Next.js API → Auth Server (Node.js/Express)
  ↓
Auth Server → Firebase Admin SDK → Session Cookie
  ↓
Session Cookie → Browser (httpOnly, secure)
```

### Components

1. **Frontend (`lib/firebase-client.ts`)**: Firebase client SDK initialization
2. **Auth Provider (`components/auth/auth-provider.tsx`)**: React context for auth state
3. **Phone Auth Form (`components/auth/phone-auth-form.tsx`)**: UI for login/signup
4. **Auth API (`lib/auth-api.ts`)**: Client-side API functions
5. **Next.js API Proxy (`app/api/auth/[...path]/route.ts`)**: Proxies requests to auth server
6. **Auth Server (`auth-server/`)**: Node.js Express server with Firebase Admin SDK

## API Endpoints

### Auth Server (Port 4000)

- `GET /auth/health` - Health check
- `POST /auth/check-phone` - Check if phone number is registered
- `POST /auth/sessionLogin` - Exchange ID token for session cookie
- `POST /auth/sessionLogout` - Clear session cookie
- `GET /auth/me` - Get current user (requires auth)
- `POST /auth/claims` - Set custom claims (admin only)

### Next.js API Proxy (Port 3000)

All endpoints are available at `/api/auth/*` and proxy to the auth server.

## Usage in Components

```tsx
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/components/auth/auth-provider';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <AuthGuard>
      <div>Welcome, {user?.phoneNumber}</div>
      <button onClick={logout}>Logout</button>
    </AuthGuard>
  );
}
```

## Troubleshooting

### "reCAPTCHA not initialized"

- Make sure Firebase Web App config is set in environment variables
- Check browser console for Firebase initialization errors

### "Failed to send OTP"

- Verify phone authentication is enabled in Firebase Console
- Check Firebase project quota/limits
- Ensure phone number format includes country code (e.g., +91)

### "Auth server unavailable"

- Verify auth server is running on port 4000
- Check `AUTH_SERVER_URL` environment variable
- Check auth server logs for errors

### Session cookie not persisting

- Ensure `secure: true` only in production (HTTPS)
- Check CORS configuration on auth server
- Verify cookie path and domain settings

## Security Notes

1. **Service Account**: Keep `satsangServiceAccount.json` secure, never commit to git
2. **Session Cookies**: Use httpOnly cookies to prevent XSS attacks
3. **CORS**: Configure allowed origins properly in production
4. **HTTPS**: Use HTTPS in production for secure cookie transmission
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse
