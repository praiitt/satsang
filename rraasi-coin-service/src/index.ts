import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import coinRoutes from './routes/coins';
import subscriptionRoutes from './routes/subscriptions';
import { authMiddleware } from './middleware/auth';
import { coinService } from './services/coinService';

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Public health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'rraasi-coin-service',
        timestamp: new Date().toISOString()
    });
});

/**
 * Internal server-to-server coin deduction endpoint.
 * Secured by X-Internal-Token header (INTERNAL_SERVICE_TOKEN).
 * Used by auth-server (music) and marketing-server (video) to deduct
 * coins after successful Firestore writes — no user Firebase token needed.
 *
 * POST /internal/deduct
 * Body: { userId, featureId, metadata? }
 */
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

app.post('/internal/check-access', async (req: Request, res: Response) => {
    const token = req.headers['x-internal-token'];
    if (!INTERNAL_SERVICE_TOKEN || token !== INTERNAL_SERVICE_TOKEN) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }

    const { userId, featureId } = req.body;
    if (!userId || !featureId) {
        res.status(400).json({ success: false, error: 'userId and featureId are required' });
        return;
    }

    try {
        const access = await coinService.checkFeatureAccess(userId, featureId);
        res.status(200).json({ success: true, access });
    } catch (err: any) {
        console.error('[Internal Check Access] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/internal/deduct', async (req: Request, res: Response) => {
    const token = req.headers['x-internal-token'];
    if (!INTERNAL_SERVICE_TOKEN || token !== INTERNAL_SERVICE_TOKEN) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }

    const { userId, featureId, metadata } = req.body;
    if (!userId || !featureId) {
        res.status(400).json({ success: false, error: 'userId and featureId are required' });
        return;
    }

    try {
        const result = await coinService.deductCoins(userId, featureId, metadata || {});
        res.status(result.success ? 200 : 402).json(result);
    } catch (err: any) {
        console.error('[Internal Deduct] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/internal/add-payout', async (req: Request, res: Response) => {
    const token = req.headers['x-internal-token'];
    if (!INTERNAL_SERVICE_TOKEN || token !== INTERNAL_SERVICE_TOKEN) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }

    const { userId, amount } = req.body;
    if (!userId || typeof amount !== 'number') {
        res.status(400).json({ success: false, error: 'userId and amount (number) are required' });
        return;
    }

    try {
        const result = await coinService.addPayoutCoins(userId, amount);
        res.status(result.success ? 200 : 500).json(result);
    } catch (err: any) {
        console.error('[Internal Add Payout] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Protected routes (require user Firebase auth)
app.use('/coins', authMiddleware, coinRoutes);
app.use('/subscriptions', authMiddleware, subscriptionRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Export for Cloud Functions
export const rraasi_coin_service = app;
