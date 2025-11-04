# Spotify Web Playback SDK Integration

This document explains how the Spotify integration works and how to configure it.

## Overview

The Satsang app now supports full Spotify integration for bhajan playback using the Spotify Web Playback SDK. When users authenticate with Spotify, they can play full bhajans instead of just 30-second previews.

## Features

- **Full Track Playback**: Play complete bhajans when authenticated with Spotify
- **Fallback to Previews**: Non-authenticated users still get 30-second previews
- **Automatic Selection**: The system automatically uses Spotify SDK when available, falls back to previews otherwise
- **Seamless Experience**: Works transparently - users just need to connect once

## Setup Instructions

### 1. Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in:
   - **App Name**: Satsang Bhajan Player (or your choice)
   - **App Description**: Voice assistant for playing devotional bhajans
   - **Redirect URI**: `http://localhost:3000/api/spotify/callback` (for development)
   - **Redirect URI**: `https://yourdomain.com/api/spotify/callback` (for production)
4. Click "Save"
5. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Spotify OAuth Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback  # For development
# SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/spotify/callback  # For production

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For development
# NEXT_PUBLIC_APP_URL=https://yourdomain.com  # For production
```

### 3. Update Spotify App Settings

In your Spotify Developer Dashboard:
1. Go to your app settings
2. Add **Redirect URIs**:
   - `http://localhost:3000/api/spotify/callback` (development)
   - `https://yourdomain.com/api/spotify/callback` (production)
3. Save changes

### 4. Deploy and Test

1. Restart your Next.js server
2. Visit the app
3. Click "Connect Spotify" button on the welcome screen
4. Authorize the app
5. You'll be redirected back with Spotify connected

## How It Works

### Authentication Flow

1. User clicks "Connect Spotify" button
2. Redirects to `/api/spotify/auth` which initiates OAuth flow
3. User authorizes on Spotify
4. Spotify redirects to `/api/spotify/callback` with authorization code
5. Server exchanges code for access/refresh tokens
6. Tokens stored in secure httpOnly cookies
7. User redirected back to app with success message

### Playback Flow

1. User requests a bhajan via voice: "krishna ka bhajan bajao"
2. Agent searches Spotify and returns track info with:
   - `spotify_id`: Track ID for SDK playback
   - `url`: Preview URL (30-second MP3) for fallback
3. **If authenticated with Spotify**:
   - Uses Spotify Web Playback SDK to play full track
   - Requires Spotify Premium account
4. **If not authenticated**:
   - Falls back to 30-second preview URL
   - Works for all users (free/premium)

### Components

- **`/api/spotify/auth`**: Initiates OAuth flow
- **`/api/spotify/callback`**: Handles OAuth callback, stores tokens
- **`/api/spotify/token`**: Returns access token for SDK (GET) or refreshes token (POST)
- **`useSpotifyPlayer`**: React hook managing Spotify Web Playback SDK
- **`BhajanPlayer`**: Enhanced player that uses SDK when available, previews otherwise
- **`SpotifyAuthButton`**: UI component for connecting Spotify

## Requirements

- **Spotify Premium**: ✅ **REQUIRED** for full track playback via SDK
  - Your account has been upgraded to Premium - you're all set!
  - Full bhajans will play automatically when authenticated
- **Free Account**: Can still use preview URLs (30 seconds) as fallback
- **Browser**: Modern browser with Web Audio API support
- **HTTPS**: Required in production (Spotify SDK requires secure context)

## Troubleshooting

### "Not authenticated with Spotify"
- Make sure you've clicked "Connect Spotify" and authorized
- Check browser cookies are enabled
- Verify environment variables are set correctly

### "Failed to initialize Spotify player"
- Check browser console for errors
- Verify Spotify Web Playback SDK script loaded
- Make sure you're using HTTPS in production (or localhost for development)

### "Spotify player not ready"
- Wait a few seconds after connecting
- Refresh the page if it doesn't connect
- Check that you have Spotify Premium (required for SDK)

### Preview URLs not working
- Some tracks don't have preview URLs
- The system will try to use Spotify SDK if available
- Otherwise, it will show an error message

## Security Notes

- Access tokens stored in httpOnly cookies (not accessible to JavaScript)
- Tokens automatically refreshed when expired
- State parameter used for CSRF protection
- Redirect URIs must match exactly in Spotify app settings

## Future Enhancements

- Player controls UI (play/pause/seek)
- Playlist support
- Queue management
- Better error handling and user feedback

