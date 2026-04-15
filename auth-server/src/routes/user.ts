import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { google } from 'googleapis';
import crypto from 'crypto';

const router = Router();
const db = getDb();

// Helper to get user doc ref
const userRef = (uid: string) => db.collection('users').doc(uid);

// GET /list - Fetch all registered users (admin-ish)
router.get('/list', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const snapshot = await db.collection('users')
            .orderBy('updatedAt', 'desc')
            .limit(limit)
            .get();

        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));

        return res.json({ success: true, users });
    } catch (error) {
        console.error('Error listing users:', error);
        return res.status(500).json({ error: 'Failed to list users' });
    }
});

// GET /profile - Get extended user profile
router.get('/profile', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const doc = await userRef(uid).get();

        if (!doc.exists) {
            // Return empty defaults if user doc doesn't exist yet
            return res.json({
                following_gurus: [],
                favorite_gurus: [],
            });
        }

        const data = doc.data();
        return res.json({
            following_gurus: data?.following_gurus || [],
            favorite_gurus: data?.favorite_gurus || [],
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /gurus/:guruId/follow - Follow a guru
router.post('/gurus/:guruId/follow', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const { guruId } = req.params;

        if (!guruId) return res.status(400).json({ error: 'Guru ID required' });

        await userRef(uid).set({
            following_gurus: FieldValue.arrayUnion(guruId),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return res.json({ success: true, guruId });
    } catch (error) {
        console.error('Error following guru:', error);
        return res.status(500).json({ error: 'Failed to follow guru' });
    }
});

// DELETE /gurus/:guruId/follow - Unfollow a guru
router.delete('/gurus/:guruId/follow', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const { guruId } = req.params;

        if (!guruId) return res.status(400).json({ error: 'Guru ID required' });

        await userRef(uid).update({
            following_gurus: FieldValue.arrayRemove(guruId)
        });

        return res.json({ success: true, guruId });
    } catch (error) {
        console.error('Error unfollowing guru:', error);
        return res.status(500).json({ error: 'Failed to unfollow guru' });
    }
});

// POST /gurus/:guruId/favorite - Favorite a guru
router.post('/gurus/:guruId/favorite', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const { guruId } = req.params;

        if (!guruId) return res.status(400).json({ error: 'Guru ID required' });

        await userRef(uid).set({
            favorite_gurus: FieldValue.arrayUnion(guruId),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return res.json({ success: true, guruId });
    } catch (error) {
        console.error('Error favoriting guru:', error);
        return res.status(500).json({ error: 'Failed to favorite guru' });
    }
});

// DELETE /gurus/:guruId/favorite - Unfavorite a guru
router.delete('/gurus/:guruId/favorite', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const { guruId } = req.params;

        if (!guruId) return res.status(400).json({ error: 'Guru ID required' });

        await userRef(uid).update({
            favorite_gurus: FieldValue.arrayRemove(guruId)
        });

        return res.json({ success: true, guruId });
    } catch (error) {
        console.error('Error unfavoriting guru:', error);
        return res.status(500).json({ error: 'Failed to unfavorite guru' });
    }
});

// ========== Platform OAuth Endpoints ==========

// Initialize YouTube OAuth client
const getYouTubeOAuth = () => {
    return new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${process.env.AUTH_SERVER_URL || 'http://localhost:4000'}/user/platforms/youtube/callback`
    );
};

// POST /platforms/youtube/connect - Initiate YouTube OAuth
router.post('/platforms/youtube/connect', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const oauth2Client = getYouTubeOAuth();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube.upload'],
            prompt: 'consent', // Force to get refresh token
            state: req.user!.uid // Pass user ID in state
        });

        return res.json({ authUrl });
    } catch (error) {
        console.error('Error initiating YouTube OAuth:', error);
        return res.status(500).json({ error: 'Failed to initiate YouTube connection' });
    }
});

// GET /platforms/youtube/callback - Handle YouTube OAuth callback
router.get('/platforms/youtube/callback', async (req, res) => {
    try {
        const { code, state: uid } = req.query;

        if (!code || !uid) {
            return res.status(400).send('Missing authorization code or user ID');
        }

        const oauth2Client = getYouTubeOAuth();
        const { tokens } = await oauth2Client.getToken(code as string);

        // Get channel info
        oauth2Client.setCredentials(tokens);
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelResponse = await youtube.channels.list({
            part: ['snippet'],
            mine: true
        });

        const channelId = channelResponse.data.items?.[0]?.id;
        const channelTitle = channelResponse.data.items?.[0]?.snippet?.title;

        // Store credentials in Firestore (simplified - in production, encrypt tokens)
        await db.collection('users').doc(uid as string).collection('platform_credentials').doc('youtube').set({
            platform: 'youtube',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            scopes: tokens.scope?.split(' ') || [],
            channelId,
            channelTitle,
            connectedAt: FieldValue.serverTimestamp()
        });

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>YouTube Connected</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .success { color: #22c55e; font-size: 24px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="success">✓ YouTube Connected Successfully!</div>
                <p>Channel: ${channelTitle || 'Unknown'}</p>
                <p>You can close this window and return to the admin page.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error in YouTube OAuth callback:', error);
        res.status(500).send('Failed to connect YouTube account');
    }
});

// POST /platforms/soundcloud/connect - Initiate SoundCloud OAuth
router.post('/platforms/soundcloud/connect', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;

        // Generate PKCE code verifier and challenge
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        // Store code verifier temporarily
        await db.collection('oauth_temp').doc(uid).set({
            codeVerifier,
            createdAt: FieldValue.serverTimestamp()
        });

        const redirectUri = `${process.env.AUTH_SERVER_URL || 'http://localhost:4000'}/user/platforms/soundcloud/callback`;

        const authUrl = new URL('https://secure.soundcloud.com/authorize');
        authUrl.searchParams.set('client_id', process.env.SOUNDCLOUD_CLIENT_ID || '');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'non-expiring');
        authUrl.searchParams.set('state', uid);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        return res.json({ authUrl: authUrl.toString() });
    } catch (error) {
        console.error('Error initiating SoundCloud OAuth:', error);
        return res.status(500).json({ error: 'Failed to initiate SoundCloud connection' });
    }
});

// GET /platforms/soundcloud/callback - Handle SoundCloud OAuth callback
router.get('/platforms/soundcloud/callback', async (req, res) => {
    try {
        const { code, state: uid } = req.query;

        if (!code || !uid) {
            return res.status(400).send('Missing authorization code or user ID');
        }

        // Retrieve code verifier
        const tempDoc = await db.collection('oauth_temp').doc(uid as string).get();
        if (!tempDoc.exists) {
            return res.status(400).send('OAuth session expired');
        }
        const { codeVerifier } = tempDoc.data()!;

        const redirectUri = `${process.env.AUTH_SERVER_URL || 'http://localhost:4000'}/user/platforms/soundcloud/callback`;
        const tokenResponse = await fetch('https://secure.soundcloud.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SOUNDCLOUD_CLIENT_ID,
                client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            })
        });

        if (!tokenResponse.ok) {
            throw new Error(`SoundCloud token exchange failed: ${tokenResponse.status}`);
        }

        const tokens = (await tokenResponse.json()) as any;

        // Get user info
        const userResponse = await fetch('https://api.soundcloud.com/me', {
            headers: { 'Authorization': `OAuth ${tokens.access_token}` }
        });
        const userData = (await userResponse.json()) as any;

        await db.collection('users').doc(uid as string).collection('platform_credentials').doc('soundcloud').set({
            platform: 'soundcloud',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
            scopes: tokens.scope?.split(' ') || [],
            username: userData.username,
            userId: userData.id,
            connectedAt: FieldValue.serverTimestamp()
        });

        await db.collection('oauth_temp').doc(uid as string).delete();

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SoundCloud Connected</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .success { color: #22c55e; font-size: 24px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="success">✓ SoundCloud Connected Successfully!</div>
                <p>Username: ${userData.username || 'Unknown'}</p>
                <p>You can close this window and return to the admin page.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error in SoundCloud OAuth callback:', error);
        res.status(500).send('Failed to connect SoundCloud account');
    }
});

// DELETE /platforms/:platform/disconnect - Disconnect platform
router.delete('/platforms/:platform/disconnect', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const { platform } = req.params;

        if (!['youtube', 'soundcloud'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        await db.collection('users').doc(uid).collection('platform_credentials').doc(platform).delete();

        return res.json({ success: true, platform });
    } catch (error) {
        console.error(`Error disconnecting ${req.params.platform}:`, error);
        return res.status(500).json({ error: 'Failed to disconnect platform' });
    }
});

// GET /platforms - Get connected platforms
router.get('/platforms', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const uid = req.user!.uid;
        const snapshot = await db.collection('users').doc(uid).collection('platform_credentials').get();

        const platforms = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                platform: data.platform,
                connected: true,
                channelId: data.channelId,
                channelTitle: data.channelTitle,
                username: data.username,
                connectedAt: data.connectedAt
            };
        });

        return res.json({ platforms });
    } catch (error) {
        console.error('Error fetching connected platforms:', error);
        return res.status(500).json({ error: 'Failed to fetch platforms' });
    }
});

export default router;
