import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';
import { IntegrationToken, INTEGRATION_TOKENS_COLLECTION } from '@/lib/types/integrations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); 
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `OAuth Error: ${error}` }, { status: 400 });
    }

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    let userId = '';
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (decoded.userId) {
            userId = decoded.userId;
            appUrl = decoded.appUrl || appUrl;
        } else {
            userId = state;
        }
    } catch {
        userId = state;
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            `${appUrl}/api/auth/youtube/callback`
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data: userInfo } = await oauth2.userinfo.get();

        initAdmin();
        const db = getAdminDb();

        const tokenData: IntegrationToken = {
            userId,
            provider: 'youtube',
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!, 
            expiryDate: tokens.expiry_date!,
            scope: tokens.scope!,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            valid: true,
            userEmail: userInfo.email!,
            displayName: userInfo.name!
        };

        await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_youtube`).set(tokenData, { merge: true });

        const successUrl = new URL(`${appUrl}/business/creators/music/distribution`);
        successUrl.searchParams.set('connected', 'youtube');
        return NextResponse.redirect(successUrl);

    } catch (err: any) {
        console.error('Error during YouTube OAuth callback:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
