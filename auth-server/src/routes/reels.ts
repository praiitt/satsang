import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { getDb } from '../firebase.js';
import fetch from 'node-fetch';

const router = Router();
// Use hardcoded production URL to avoid any dotenv loading issues
const getCoinServiceUrl = () => 'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';
const getMarketingServerUrl = () => process.env.MARKETING_SERVER_URL || 'http://localhost:4001';
const getInternalToken = () => process.env.INTERNAL_SERVICE_TOKEN || 'internal-rraasi-token-42';

/**
 * POST /api/reels/generate
 * Trigger generation of a Spiritual Reel (Phase 1: Affirmations)
 */
router.post('/generate', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const { intention, preGeneratedScript, preGeneratedImagePrompt } = req.body;
        const userId = req.user!.uid;

        if (!intention) {
            return res.status(400).json({ error: 'Intention is required' });
        }

        const db = getDb();

        console.log('[DEBUG] COIN_SERVICE_URL in process.env:', process.env.COIN_SERVICE_URL);
        console.log('[DEBUG] getCoinServiceUrl() output:', getCoinServiceUrl());

        // Step 1: Create a placeholder document in Firestore
        const reelRef = db.collection('spiritual_reels').doc();
        const reelId = reelRef.id;

        await reelRef.set({
            id: reelId,
            userId,
            intention,
            status: 'generating',
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'affirmation'
        });

        // Step 2: Deduct 120 coins
        const deductRes = await fetch(`${getCoinServiceUrl()}/internal/deduct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-token': getInternalToken()
            },
            body: JSON.stringify({
                userId,
                featureId: 'spiritual_reel_affirmation',
                metadata: { reelId, intention }
            })
        });

        if (!deductRes.ok) {
            // Delete placeholder if deduction fails
            await reelRef.delete();
            if (deductRes.status === 402) {
                return res.status(402).json({ error: 'Not enough coins' });
            }
            throw new Error(`Coin deduction failed: ${deductRes.statusText}`);
        }

        // Step 3: Call marketing-server to generate the reel asynchronously
        // We do not await this fetch because video generation takes minutes.
        fetch(`${getMarketingServerUrl()}/internal/reels/generate-affirmation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-token': getInternalToken()
            },
            body: JSON.stringify({
                userId,
                reelId,
                intention,
                preGeneratedScript,
                preGeneratedImagePrompt
            })
        }).catch(err => {
            console.error('[Spiritual Reels] Async trigger to marketing-server failed:', err);
            // In a real production system, you'd want a retry queue here.
            reelRef.update({ status: 'failed', error: 'Failed to start generation engine' }).catch(console.error);
        });

        // Return immediately to the client
        res.json({
            success: true,
            message: 'Reel generation started',
            reelId,
            status: 'generating'
        });

    } catch (error) {
        console.error('[Spiritual Reels API] Error:', error);
        res.status(500).json({
            error: 'Failed to start reel generation',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/reels
 * List user's spiritual reels
 */
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user!.uid;
        const db = getDb();
        
        const snapshot = await db.collection('spiritual_reels')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
            
        const reels = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
            };
        });
        
        res.json({ reels });
    } catch (error) {
        console.error('[Spiritual Reels API] Error fetching:', error);
        res.status(500).json({ error: 'Failed to fetch reels' });
    }
});

export default router;
