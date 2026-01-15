import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';

const router = Router();

// GET /chat/history?userId=...&agentId=...&limit=20
router.get('/history', async (req: Request, res: Response) => {
    try {
        const { userId, agentId, limit = '20' } = req.query;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const db = getDb();
        let query = db.collection('chat_history')
            .where('userId', '==', userId);

        // Optional: filter by specific agent interaction if needed
        // For now, we might want all history or just filtering by agent if provided
        if (agentId) {
            query = query.where('agentId', '==', agentId);
        }

        const snapshot = await query
            .orderBy('timestamp', 'desc')
            .limit(Number(limit))
            .get();

        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).reverse(); // Return in chronological order for the client

        res.json({ messages });
    } catch (error) {
        console.error('[Chat History] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /chat/recordings?userId=...&limit=10
router.get('/recordings', async (req: Request, res: Response) => {
    try {
        const { userId, limit = '10' } = req.query;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const db = getDb();
        const snapshot = await db.collection('recordings')
            .where('userId', '==', userId)
            .where('status', '==', 'completed') // Only show completed recordings
            .orderBy('createdAt', 'desc') // Use createdAt or endedAt
            .limit(Number(limit))
            .get();

        const recordings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ recordings });
    } catch (error) {
        console.error('[Chat Recordings] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
