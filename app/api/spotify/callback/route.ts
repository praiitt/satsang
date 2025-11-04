import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Spotify OAuth Callback Endpoint
 * 
 * Handles the OAuth callback from Spotify after user authorization.
 * Exchanges authorization code for access/refresh tokens.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Check for errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=spotify_auth_failed&message=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Verify state (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get('spotify_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/?error=spotify_auth_state_mismatch', request.url)
    );
  }

  // Clear state cookie
  cookieStore.delete('spotify_oauth_state');

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=spotify_auth_no_code', request.url)
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 
    `${request.headers.get('origin') || 'https://satsang.rraasi.com'}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?error=spotify_config_missing', request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Spotify token exchange error:', errorData);
      return NextResponse.redirect(
        new URL(`/?error=spotify_token_exchange_failed`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // In production, store tokens securely (database, encrypted)
    // For now, store in httpOnly cookie (not ideal for production)
    const response = NextResponse.redirect(new URL('/?spotify_auth=success', request.url));
    
    // Store access token (in production, use secure session storage)
    response.cookies.set('spotify_access_token', tokenData.access_token, {
      maxAge: tokenData.expires_in,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Store refresh token securely (in production, use database)
    if (tokenData.refresh_token) {
      response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    return NextResponse.redirect(
      new URL('/?error=spotify_callback_error', request.url)
    );
  }
}

