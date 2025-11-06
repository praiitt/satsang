import { NextResponse } from 'next/server';

// Returns Spotify account info for the configured refresh token
// Useful to verify the identity/product of the account used for playback
export async function GET() {
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

  if (!refreshToken) {
    return NextResponse.json({ error: 'SPOTIFY_REFRESH_TOKEN not configured' }, { status: 401 });
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  try {
    // Exchange refresh token for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json().catch(() => ({}));
      return NextResponse.json({ error: 'Failed to refresh token', details: err }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string | undefined = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token in refresh response' }, { status: 500 });
    }

    // Fetch profile
    const meResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      const err = await meResponse.json().catch(() => ({}));
      return NextResponse.json({ error: 'Failed to fetch profile', details: err }, { status: 500 });
    }

    const profile = await meResponse.json();
    // Return a concise view + raw
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      product: profile.product,
      country: profile.country,
      raw: profile,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
