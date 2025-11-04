import { NextResponse } from 'next/server';

/**
 * Spotify OAuth token endpoint
 * 
 * This endpoint handles Spotify OAuth flow and returns access tokens.
 * For production, you should implement proper OAuth flow with refresh tokens.
 * 
 * For now, this uses the SPOTIFY_ACCESS_TOKEN from environment (same as backend).
 * In production, implement OAuth flow:
 * 1. Redirect user to Spotify authorization
 * 2. Exchange code for access/refresh tokens
 * 3. Store refresh token securely
 * 4. Refresh access token when expired
 */

export async function GET() {
  try {
    // For now, use the same token from environment (backend token)
    // In production, implement proper OAuth flow per user
    const token = process.env.SPOTIFY_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: 'Spotify access token not configured' },
        { status: 500 }
      );
    }

    // Return token (in production, this should be user-specific from OAuth)
    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
    });
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return NextResponse.json(
      { error: 'Failed to get Spotify token' },
      { status: 500 }
    );
  }
}

