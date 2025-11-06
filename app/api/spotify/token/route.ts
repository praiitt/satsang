import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Get Spotify access token - always uses .env SPOTIFY_REFRESH_TOKEN
export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;

  // If access token exists and is valid, return it
  if (accessToken) {
    return NextResponse.json({ access_token: accessToken });
  }

  // Always use .env refresh token (no cookie fallback)
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Not authenticated with Spotify - SPOTIFY_REFRESH_TOKEN not configured' },
      { status: 401 }
    );
  }

  // Refresh the access token
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Failed to refresh Spotify token:', errorData);
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not provided

    // Ensure accessToken is defined before setting cookie
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token in refresh response' }, { status: 500 });
    }

    // Update access token cookie
    const response = NextResponse.json({ access_token: accessToken });
    response.cookies.set('spotify_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn,
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Refresh token endpoint - always uses .env SPOTIFY_REFRESH_TOKEN
export async function POST() {
  // Always use .env refresh token (no cookie fallback)
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token available - SPOTIFY_REFRESH_TOKEN not configured' },
      { status: 401 }
    );
  }

  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    // Update access token cookie
    const response = NextResponse.json({ access_token });
    response.cookies.set('spotify_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expires_in,
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
