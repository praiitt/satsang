import express from 'express';
import { MarketingService } from '../services/marketing-service.js';

const router = express.Router();

/**
 * POST /marketing/welcome
 * Triggers the "Eco-Culture" welcome packet
 */
router.post('/welcome', async (req, res) => {
    try {
        const { userId, email, phone, serviceOfInterest, name, zodiacSign } = req.body;

        if (!userId || !serviceOfInterest) {
            return res.status(400).json({ error: 'Missing required fields: userId, serviceOfInterest' });
        }

        const result = await MarketingService.sendWelcomePacket(
            userId,
            email, // might be undefined if phone-only login
            phone, // might be undefined if email-only login (though current flow is phone)
            {
                serviceOfInterest: serviceOfInterest || 'general',
                userName: name,
                zodiacSign,
            }
        );

        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Marketing Welcome Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


/**
 * GET /marketing/logs
 * Fetch recent marketing logs
 */
router.get('/logs', async (req, res) => {
    try {
        const { getDb } = await import('../firebase.js');
        const db = getDb();
        const limit = parseInt(req.query.limit as string) || 50;

        const snapshot = await db.collection('marketing_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamp to ISO string if needed, mostly handled by JSON
        }));

        return res.json({ success: true, logs });
    } catch (error) {
        console.error('Marketing Logs Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
