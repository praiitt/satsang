
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/soundcloud/callback`;

    if (!clientId) {
        return NextResponse.json({ error: 'SoundCloud Client ID not configured' }, { status: 500 });
    }

    const authUrl = `https://soundcloud.com/connect` +
        `?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&state=${userId}`; // Pass userId as state

    return NextResponse.redirect(authUrl);
}
