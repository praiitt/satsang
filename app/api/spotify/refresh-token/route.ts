import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Admin endpoint to view the refresh token (for setup purposes)
// This allows you to copy the refresh token to .env.local
export async function GET() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token found in cookies. Please authenticate first.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    refresh_token: refreshToken,
    message: 'Copy this refresh_token to your .env.local file as SPOTIFY_REFRESH_TOKEN',
  });
}
