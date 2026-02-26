
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

    const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/soundcloud/callback`;

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'SoundCloud credentials not configured' }, { status: 500 });
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch('https://api.soundcloud.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: code
            }).toString()
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('SoundCloud Token Error:', errorText);
            return NextResponse.json({ error: 'Failed to exchange token', details: errorText }, { status: tokenResponse.status });
        }

        const tokens = await tokenResponse.json();

        // Initialize Firebase Admin
        initAdmin();
        const db = getAdminDb();

        // Get user info (optional, but good for display name)
        // We can use the access token to fetch /me
        let userInfo = { username: 'SoundCloud User', email: '' };
        try {
            const userResponse = await fetch('https://api.soundcloud.com/me', {
                headers: {
                    'Authorization': `OAuth ${tokens.access_token}`
                }
            });
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userInfo.username = userData.username;
                // SoundCloud might not return email in all scopes, but let's try
            }
        } catch (e) {
            console.warn('Failed to fetch SoundCloud user info', e);
        }

        const tokenData: IntegrationToken = {
            userId,
            provider: 'soundcloud',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            // SoundCloud tokens usually don't have explicit expiry in seconds in the same way, or it's in `expires_in`
            // Standard OAuth strictly returns expires_in (seconds)
            expiryDate: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : undefined,
            scope: tokens.scope,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            valid: true,
            userEmail: '', // SoundCloud often doesn't share email
            displayName: userInfo.username
        };

        // Using userId_provider as doc ID for easy overwriting
        await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_soundcloud`).set(tokenData, { merge: true });

        // Redirect to the distribution dashboard
        const successUrl = new URL('/business/creators/music/distribution', request.url);
        successUrl.searchParams.set('connected', 'soundcloud');
        return NextResponse.redirect(successUrl);

    } catch (err: any) {
        console.error('Error during SoundCloud OAuth callback:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
