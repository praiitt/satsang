import express from 'express';
import axios from 'axios';
import { logger } from '../utils/logger.js';

const router = express.Router();

const TAROT_ENDPOINT = 'https://json.astrologyapi.com/v1/tarot_predictions';

// POST /api/tarot/predictions
router.post('/predictions', async (req, res) => {
    try {
        const apiKey = process.env.ASTROLOGY_API_KEY;
        const userId = process.env.ASTROLOGY_USER_ID;

        if (!apiKey || !userId) {
            return res.status(500).json({ error: 'Missing astrology API credentials' });
        }

        const language = req.headers['accept-language'] || req.body.language || 'en';
        const lang = language.toLowerCase().startsWith('hi') ? 'hi' : 'en';

        // Use same x-astrologyapi-key method as the PDF/reports service
        logger.info('[TarotRoute] Fetching tarot predictions', { lang, body: req.body });

        const response = await axios.post(TAROT_ENDPOINT, req.body, {
            headers: {
                'x-astrologyapi-key': apiKey,
                'Content-Type': 'application/json',
                'Accept-Language': lang,
            },
            timeout: 30000,
        });

        logger.info('[TarotRoute] Tarot predictions fetched successfully');
        return res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const detail = error.response?.data || error.message;
        logger.error('[TarotRoute] Error fetching tarot predictions', { status, detail });
        return res.status(status).json({
            error: 'Failed to fetch tarot predictions',
            details: typeof detail === 'object' ? JSON.stringify(detail) : detail,
        });
    }
});

export default router;
