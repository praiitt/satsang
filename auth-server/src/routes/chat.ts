import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';

const router = Router();

// GET /chat/history?userId=...&agentId=...&limit=20
router.get('/history', async (req: Request, res: Response) => {
    try {
        const { userId, agentId, limit = '20' } = (req.query || {}) as any;

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

// GET /chat/transcripts?userId=...&agentName=...&limit=20
router.get('/transcripts', async (req: Request, res: Response) => {
    try {
        const { userId, agentName, limit = '20' } = (req.query || {}) as any;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const db = getDb();
        let query = db.collection('session_transcripts')
            .where('userId', '==', userId);

        if (agentName) {
            query = query.where('agentName', '==', agentName);
        }

        const snapshot = await query
            .orderBy('createdAt', 'desc')
            .limit(Number(limit))
            .get();

        const transcripts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure date format is serializable
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            };
        });

        res.json({ transcripts });
    } catch (error) {
        console.error('[Session Transcripts] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET /chat/recordings?userId=...&limit=10
router.get('/recordings', async (req: Request, res: Response) => {
    try {
        const { userId, limit = '10' } = (req.query || {}) as any;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const db = getDb();
        console.log('[Recordings] Fetching for userId:', userId);

        const snapshot = await db.collection('recordings')
            .where('userId', '==', userId)
            .orderBy('startedAt', 'desc')  // Changed from createdAt to startedAt
            .limit(Number(limit) * 2)
            .get();

        console.log('[Recordings] Found', snapshot.size, 'documents');

        // Filter for completed/stopped recordings in code
        const recordings = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().startedAt  // Map startedAt to createdAt for frontend compatibility
            }))
            .filter((rec: any) => rec.status === 'completed' || rec.status === 'stopped')
            .slice(0, Number(limit));

        console.log('[Recordings] After filtering:', recordings.length, 'recordings');
        res.json({ recordings });
    } catch (error) {
        console.error('[Chat Recordings] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /chat/feed?limit=10
router.get('/feed', async (req: Request, res: Response) => {
    try {
        const { limit = '10' } = (req.query || {}) as any;
        const db = getDb();

        // Fetch public recordings
        // Note: For true randomness, we might need a better strategy,
        // but for now we'll fetch the most recent 100 public ones and shuffle them.
        const snapshot = await db.collection('recordings')
            .where('isPublic', '==', true)
            .where('status', 'in', ['completed', 'stopped'])
            .orderBy('startedAt', 'desc')
            .limit(100)
            .get();

        let recordings = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().startedAt
            }))
            .filter((rec: any) => !!rec.publicUrl); // Ensure only recordings with actual URLs are shown

        // Remove Shuffle - user wants latest first
        recordings = recordings.slice(0, Number(limit));

        res.json({ recordings });
    } catch (error) {
        console.error('[Chat Feed] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
