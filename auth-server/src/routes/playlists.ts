import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';

const router = Router();

/**
 * GET /api/playlists/:userId
 * List all playlists for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const db = getDb();
        const snapshot = await db.collection('playlists')
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .get();

        const playlists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ playlists });
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

/**
 * POST /api/playlists
 * Create a new playlist
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { userId, name, description, coverImage } = req.body;

        if (!userId || !name) {
            return res.status(400).json({ error: 'userId and name are required' });
        }

        const db = getDb();
        const newPlaylist = {
            userId,
            name,
            description: description || '',
            coverImage: coverImage || null,
            trackIds: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            trackCount: 0
        };

        const docRef = await db.collection('playlists').add(newPlaylist);

        res.status(201).json({
            success: true,
            playlist: {
                id: docRef.id,
                ...newPlaylist
            }
        });
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

/**
 * POST /api/playlists/:id/tracks
 * Add a track to a playlist
 */
router.post('/:id/tracks', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { trackId } = req.body;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        const db = getDb();
        const playlistRef = db.collection('playlists').doc(id);
        const playlistDoc = await playlistRef.get();

        if (!playlistDoc.exists) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Add trackId to array if not exists
        await playlistRef.update({
            trackIds: admin.firestore.FieldValue.arrayUnion(trackId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            trackCount: admin.firestore.FieldValue.increment(1)
        });

        res.json({ success: true, message: 'Track added to playlist' });
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        res.status(500).json({ error: 'Failed to add track' });
    }
});

/**
 * DELETE /api/playlists/:id/tracks
 * Remove a track from a playlist
 */
router.delete('/:id/tracks', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { trackId } = req.body;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        const db = getDb();
        const playlistRef = db.collection('playlists').doc(id);

        await playlistRef.update({
            trackIds: admin.firestore.FieldValue.arrayRemove(trackId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            trackCount: admin.firestore.FieldValue.increment(-1)
        });

        res.json({ success: true, message: 'Track removed from playlist' });
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        res.status(500).json({ error: 'Failed to remove track' });
    }
});

/**
 * GET /api/playlists/:id
 * Get details + full track objects
 */
router.get('/details/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const playlistDoc = await db.collection('playlists').doc(id).get();
        if (!playlistDoc.exists) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const playlist = { id: playlistDoc.id, ...playlistDoc.data() } as any;
        const trackIds = playlist.trackIds || [];

        if (trackIds.length === 0) {
            return res.json({ playlist, tracks: [] });
        }

        // Fetch all tracks in parallel (Firestore 'in' query supports up to 10-30 depending on client, 
        // but simple parallelism is easier if list is < 100)
        // For efficiency/simplicity with small lists, let's just use getAll if possible or parallel gets.
        // NOTE: db.getAll(...refs) is efficient.

        const trackRefs = trackIds.map((tid: string) => db.collection('music_tracks').doc(tid));

        // Firestore getAll might fail if list is huge, but reasonable for < 100
        const trackSnaps = await db.getAll(...trackRefs);

        const tracks = trackSnaps
            .filter(t => t.exists)
            .map(t => ({ id: t.id, ...t.data() }));

        res.json({ playlist, tracks });
    } catch (error) {
        console.error('Error getting playlist details:', error);
        res.status(500).json({ error: 'Failed to fetch playlist details' });
    }
});

export default router;
