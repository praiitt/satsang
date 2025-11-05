import { NextResponse } from 'next/server';

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/spotify/callback`;
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'user-read-email',
  'user-read-private',
].join(' ');

export async function GET() {
  if (!SPOTIFY_CLIENT_ID) {
    return NextResponse.json(
      {
        error: 'Spotify Client ID not configured',
        message: 'Please set SPOTIFY_CLIENT_ID in your .env.local file',
      },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // Store state in cookie (expires in 10 minutes)
  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
  }).toString()}`;

  const response = NextResponse.redirect(authUrl);

  // Store state in httpOnly cookie for security
  response.cookies.set('spotify_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
