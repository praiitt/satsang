
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';
import { IntegrationToken, INTEGRATION_TOKENS_COLLECTION } from '@/lib/types/integrations';

// Force dynamic since we use searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // We passed userId as state
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `OAuth Error: ${error}` }, { status: 400 });
    }

    if (!code || !userId) {
        return NextResponse.json({ error: 'Missing code or state (userId)' }, { status: 400 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user profile info
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data: userInfo } = await oauth2.userinfo.get();

        // Initialize Firebase Admin
        initAdmin();
        const db = getAdminDb();

        const tokenData: IntegrationToken = {
            userId,
            provider: 'youtube',
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!, // Important: might be undefined if not first consent or prompt not forced
            expiryDate: tokens.expiry_date!,
            scope: tokens.scope!,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            valid: true,
            userEmail: userInfo.email!,
            displayName: userInfo.name!
        };

        // Use a composite ID or just query by userId + provider
        // Using userId_provider as doc ID for easy overwriting
        await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_youtube`).set(tokenData, { merge: true });

        // Redirect to the distribution dashboard
        const successUrl = new URL('/business/creators/music/distribution', request.url);
        successUrl.searchParams.set('connected', 'youtube');
        return NextResponse.redirect(successUrl);

    } catch (err: any) {
        console.error('Error during YouTube OAuth callback:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
