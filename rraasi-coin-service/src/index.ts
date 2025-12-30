import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import coinRoutes from './routes/coins';
import subscriptionRoutes from './routes/subscriptions';
import { authMiddleware } from './middleware/auth';

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

// Protected routes (require auth)
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
