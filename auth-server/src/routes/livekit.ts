import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';

const router = Router();

/**
 * POST /api/livekit/map-session
 * Maps a RoomID to a UserID for robust agent retrieval
 */
router.post('/map-session', async (req: Request, res: Response) => {
    try {
        const { roomName, userId, agentName } = req.body;

        if (!roomName || !userId) {
            return res.status(400).json({ error: 'roomName and userId are required' });
        }

        console.log(`[LiveKit Map] Mapping Room ${roomName} -> User ${userId}`);

        const db = getDb();
        const batch = db.batch();

        // 1. Save Session Details
        const sessionRef = db.collection('room_sessions').doc(roomName);
        batch.set(sessionRef, {
            roomName,
            userId,
            agentName: agentName || 'unknown',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 2. Add Room ID to User's History
        const userRef = db.collection('users').doc(userId);
        batch.set(userRef, {
            room_ids: admin.firestore.FieldValue.arrayUnion(roomName),
            last_room_id: roomName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        await batch.commit();

        res.json({ success: true, message: 'Session mapped and user history updated' });
    } catch (error) {
        console.error('[LiveKit Map] Error mapping session:', error);
        res.status(500).json({ error: 'Failed to map session' });
    }
});

/**
 * GET /api/livekit/session/:roomName
 * Retrieves user info for a room
 */
router.get('/session/:roomName', async (req: Request, res: Response) => {
    try {
        const { roomName } = req.params;
        const db = getDb();
        const doc = await db.collection('room_sessions').doc(roomName).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(doc.data());
    } catch (error) {
        console.error('[LiveKit Map] Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

export default router;
