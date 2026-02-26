
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: userId, // Pass userId as state to retrieve in callback
        prompt: 'consent' // Force prompts to ensure refresh token is returned
    });

    return NextResponse.redirect(authUrl);
}
