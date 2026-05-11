import { Router } from 'express';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { createMusicVideo } from '../services/video-maker.js';

const router = Router();

/**
 * POST /video-maker
 *
 * Generates a music video from an audio URL and lyrics
 * Body: { audioUrl: string, lyrics: string }
 */
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { audioUrl, lyrics, trackId } = req.body as { audioUrl?: string, lyrics?: string, trackId?: string };
    console.log("req.body:", req.body);
    const userId = req.user?.uid;
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN || '';
    const COIN_SERVICE_URL = process.env.COIN_SERVICE_URL || 'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({ error: 'audioUrl is required and must be a string' });
    }

    if (!lyrics || typeof lyrics !== 'string') {
      return res.status(400).json({ error: 'lyrics is required and must be a string' });
    }

    // 1. Coin Balance Check (Fail-closed)
    try {
      console.log(`[video-maker-route] Checking coins for user: ${userId}`);
      const checkRes = await fetch(`${COIN_SERVICE_URL}/internal/check-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken
        },
        body: JSON.stringify({ userId, featureId: 'music_video_creation' })
      });

      const checkResult = await checkRes.json() as any;
      if (!checkResult.success || !checkResult.access?.hasAccess) {
        console.warn(`[video-maker-route] 🚫 Insufficient coins for user ${userId}: ${checkResult.access?.availableCoins || 0} < 300`);
        return res.status(403).json({
          error: 'Insufficient coins',
          message: 'You need at least 300 coins to create an AI music video.',
          availableCoins: checkResult.access?.availableCoins || 0,
          requiredCoins: 300
        });
      }
      console.log(`[video-maker-route] ✅ Coin check passed (Balance: ${checkResult.access.availableCoins})`);
    } catch (coinError) {
      console.error('[video-maker-route] Coin check failed (error):', coinError);
      // If the coin service is down, should we allow or block?
      // For expensive video gen, we should probably block or fail closed.
      return res.status(500).json({ error: 'Service temporarily unavailable (coin check failed)' });
    }

    // Set a long timeout since this is a slow background task (can take 1-3 minutes)
    // In Express we can set the socket timeout
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes

    const result = await createMusicVideo({
      audioUrl,
      lyrics,
      userId,
      trackId
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate video',
      });
    }

    return res.json({
      success: true,
      videoUrl: result.videoUrl,
    });
  } catch (error: any) {
    console.error('[video-maker-route] Error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error?.message || String(error),
    });
  }
});

export default router;
