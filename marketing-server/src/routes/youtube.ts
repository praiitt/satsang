import { Router } from 'express';
import { google } from 'googleapis';
import { getDb } from '../firebase.js';

const router = Router();

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

const INTEGRATION_TOKENS_COLLECTION = 'integration_tokens';

// GET /youtube-auth/init?userId=...
router.get('/init', async (req, res) => {
    const { userId, appUrl } = (req.query || {}) as any;

    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }

    const baseUrl = (appUrl as string) || process.env.NEXT_PUBLIC_APP_URL || 'https://rraasi.com';
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

    res.redirect(authUrl);
});

// GET /youtube-auth/callback?code=...&state=...
router.get('/callback', async (req, res) => {
    const { code, state, error } = (req.query || {}) as any;

    if (error) {
        return res.status(400).json({ error: `OAuth Error: ${error}` });
    }

    if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
    }

    let userId = '';
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rraasi.com';
    try {
        const decoded = JSON.parse(Buffer.from(state as string, 'base64').toString('utf8'));
        if (decoded.userId) {
            userId = decoded.userId;
            appUrl = decoded.appUrl || appUrl;
        } else {
            userId = state as string;
        }
    } catch (e) {
        userId = state as string;
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            `${appUrl}/api/auth/youtube/callback`
        );

        const { tokens } = await oauth2Client.getToken(code as string);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const { data: userInfo } = await oauth2.userinfo.get();

        const db = getDb();
        const tokenData = {
            userId: userId,
            provider: 'youtube',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            scope: tokens.scope,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            valid: true,
            userEmail: userInfo.email,
            displayName: userInfo.name
        };

        await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_youtube`).set(tokenData, { merge: true });

        // Redirect back to frontend
        res.redirect(`${appUrl}/business/creators/music/distribution?connected=youtube`);

    } catch (err: any) {
        console.error('Error during YouTube OAuth callback:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// GET /youtube-auth/status?userId=...
router.get('/status', async (req, res) => {
    const { userId } = (req.query || {}) as any;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const db = getDb();
        const doc = await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_youtube`).get();
        res.json({ connected: doc.exists && doc.data()?.valid });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

export default router;
