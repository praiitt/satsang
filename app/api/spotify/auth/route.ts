import { NextResponse } from 'next/server';

/**
 * Spotify OAuth Authorization Endpoint
 * 
 * Initiates OAuth flow by redirecting user to Spotify authorization page.
 * 
 * After user authorizes, Spotify redirects to /api/spotify/callback
 */

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 
    `${request.headers.get('origin') || 'https://satsang.rraasi.com'}/api/spotify/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'SPOTIFY_CLIENT_ID not configured' },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  
  // Store state in cookie or session (for production, use secure session storage)
  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent('user-read-playback-state user-modify-playback-state user-read-currently-playing streaming')}&` +
    `state=${state}&` +
    `show_dialog=true`
  );

  // Set state cookie (in production, use httpOnly, secure cookies)
  response.cookies.set('spotify_oauth_state', state, {
    maxAge: 600, // 10 minutes
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}

