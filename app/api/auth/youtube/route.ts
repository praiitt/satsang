import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const appUrl = searchParams.get('appUrl');

    if (!userId) {
        return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    const stateObj = { userId, appUrl: baseUrl };
    const stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: stateStr,
        prompt: 'consent select_account'
    });

    return NextResponse.redirect(authUrl);
}
