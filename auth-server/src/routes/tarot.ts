
import express from 'express';
import { getTarotPredictions } from '../services/tarotService.js';

const router = express.Router();

router.post('/predictions', async (req, res) => {
    try {
        // Default data if not provided, or validate input
        const data = req.body;
        const language = req.headers['accept-language'] as string || req.body.language || 'en';

        // Verify at least one category is present or pass through
        if (!data || Object.keys(data).length === 0) {
            // Example default if needed, or let API handle validation
        }

        const result = await getTarotPredictions(data, language);
        res.json(result);
    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({
            error: 'Failed to fetch tarot predictions',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router;
