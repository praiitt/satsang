import { Router, Request, Response } from 'express';
import { coinService } from '../services/coinService';

const router = Router();

/**
 * GET /coins/balance
 * Get user's coin balance
 */
router.get('/balance', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;

        const result = await coinService.getCoinBalance(userId);

        if (!result.success) {
            res.status(500).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        console.error('[Coins API] Balance error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /coins/check-access
 * Check if user can access a feature
 */
router.post('/check-access', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;
        const { featureId } = req.body;

        if (!featureId) {
            res.status(400).json({
                success: false,
                error: 'featureId is required'
            });
            return;
        }

        const result = await coinService.checkFeatureAccess(userId, featureId);
        res.json(result);
    } catch (error: any) {
        console.error('[Coins API] Check access error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /coins/deduct
 * Deduct coins for feature usage
 */
router.post('/deduct', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;
        const { featureId, metadata } = req.body;

        if (!featureId) {
            res.status(400).json({
                success: false,
                error: 'featureId is required'
            });
            return;
        }

        const result = await coinService.deductCoins(userId, featureId, metadata || {});

        if (!result.success) {
            res.status(result.hasAccess === false ? 402 : 500).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        console.error('[Coins API] Deduct error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /coins/deduct-satsang
 * Deduct coins for Satsang session based on duration
 */
router.post('/deduct-satsang', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;
        const { durationMinutes, metadata } = req.body;

        if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
            res.status(400).json({
                success: false,
                error: 'Valid durationMinutes is required'
            });
            return;
        }

        const result = await coinService.deductSatsangCoins(userId, durationMinutes, metadata || {});

        if (!result.success) {
            res.status(result.hasAccess === false ? 402 : 500).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        console.error('[Coins API] Deduct Satsang error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /coins/transactions
 * Get transaction history
 */
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await coinService.getTransactionHistory(userId, limit);
        res.json(result);
    } catch (error: any) {
        console.error('[Coins API] Transactions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /coins/features
 * Get all feature costs
 */
router.get('/features', async (req: Request, res: Response) => {
    try {
        const features = coinService.getAllFeatureCosts();
        res.json({
            success: true,
            features
        });
    } catch (error: any) {
        console.error('[Coins API] Features error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /coins/features/:featureId
 * Get specific feature cost
 */
router.get('/features/:featureId', async (req: Request, res: Response) => {
    try {
        const { featureId } = req.params;
        const feature = coinService.getFeatureCost(featureId);

        if (!feature) {
            res.status(404).json({
                success: false,
                error: 'Feature not found'
            });
            return;
        }

        res.json({
            success: true,
            feature
        });
    } catch (error: any) {
        console.error('[Coins API] Feature detail error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /coins/bonus
 * Add bonus coins (admin only - would need additional auth check)
 */
router.post('/bonus', async (req: Request, res: Response) => {
    try {
        const { userId, amount, reason } = req.body;

        if (!userId || !amount) {
            res.status(400).json({
                success: false,
                error: 'userId and amount are required'
            });
            return;
        }

        const result = await coinService.addBonusCoins(userId, amount, reason || 'Bonus');
        res.json(result);
    } catch (error: any) {
        console.error('[Coins API] Bonus error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
