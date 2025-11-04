import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Spotify Token Endpoint
 * 
 * Returns access token for Spotify Web Playback SDK.
 * 
 * Current implementation:
 * - Uses SPOTIFY_ACCESS_TOKEN from environment (works for testing)
 * - For production, implement OAuth flow with user authentication
 * 
 * Environment variables needed:
 * - SPOTIFY_CLIENT_ID: Your Spotify app Client ID
 * - SPOTIFY_CLIENT_SECRET: Your Spotify app Client Secret (keep secure!)
 * - SPOTIFY_ACCESS_TOKEN: Direct access token (temporary, for testing)
 * 
 * For OAuth flow (recommended for production):
 * 1. Create /api/spotify/auth endpoint to redirect to Spotify
 * 2. Create /api/spotify/callback endpoint to handle OAuth callback
 * 3. Store refresh tokens securely (database, encrypted)
 * 4. Use refresh tokens to get new access tokens
 */

export async function GET(request: Request) {
  try {
    // Option 1: Check for user's access token from OAuth (in cookies)
    const cookieStore = await cookies();
    const userAccessToken = cookieStore.get('spotify_access_token')?.value;
    
    if (userAccessToken) {
      return NextResponse.json({
        access_token: userAccessToken,
        token_type: 'Bearer',
        expires_in: 3600, // 1 hour (actual expiry from token)
      });
    }

    // Option 2: Use direct access token from environment (for testing)
    const directToken = process.env.SPOTIFY_ACCESS_TOKEN;
    if (directToken) {
      return NextResponse.json({
        access_token: directToken,
        token_type: 'Bearer',
        expires_in: 3600, // 1 hour
      });
    }

    // Option 3: No token available - return OAuth info
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    
    return NextResponse.json(
      { 
        error: 'OAuth authentication required',
        message: 'Web Playback SDK requires user authentication. Please authenticate with Spotify.',
        auth_url: clientId ? '/api/spotify/auth' : null,
        client_id: clientId, // Return client ID for OAuth redirect
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return NextResponse.json(
      { error: 'Failed to get Spotify token' },
      { status: 500 }
    );
  }
}

