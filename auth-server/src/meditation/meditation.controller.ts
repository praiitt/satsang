import { Router, Request, Response } from 'express';
import { meditationService } from './meditation.service.js';

const router = Router();

/**
 * GET /api/meditation/sessions
 * Get user's meditation sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const sessions = await meditationService.getUserSessions(userId, limit);
        res.json({ sessions });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * GET /api/meditation/sessions/:id
 * Get specific session
 */
router.get('/sessions/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const session = await meditationService.getSession(id);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ session });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

/**
 * POST /api/meditation/sessions
 * Save completed meditation session
 */
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const {
            userId,
            intention,
            mood_before,
            mood_after,
            musicUsed = [],
            generatedMusic = false,
            duration,
            agentGuided = true,
            notes
        } = req.body;

        if (!userId || !intention || !mood_before || !duration) {
            return res.status(400).json({
                error: 'Missing required fields: userId, intention, mood_before, duration'
            });
        }

        const sessionId = await meditationService.saveSession({
            userId,
            intention,
            mood_before,
            mood_after,
            musicUsed,
            generatedMusic,
            duration,
            agentGuided,
            notes
        } as any); // completedAt will be set by service

        res.status(201).json({
            success: true,
            sessionId,
            message: 'Session saved successfully'
        });
    } catch (error) {
        console.error('Error saving session:', error);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

/**
 * PATCH /api/meditation/sessions/:id/mood
 * Update post-meditation mood
 */
router.patch('/sessions/:id/mood', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { mood_after, notes } = req.body;

        if (!mood_after) {
            return res.status(400).json({ error: 'mood_after is required' });
        }

        await meditationService.updateSessionMood(id, mood_after, notes);

        res.json({
            success: true,
            message: 'Mood updated successfully'
        });
    } catch (error) {
        console.error('Error updating mood:', error);
        res.status(500).json({ error: 'Failed to update mood' });
    }
});

/**
 * GET /api/meditation/stats
 * Get user statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const stats = await meditationService.getUserStats(userId);
        res.json({ stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/meditation/playlists
 * Get meditation playlists
 */
router.get('/playlists', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const sessionType = req.query.sessionType as string;

        const playlists = await meditationService.getPlaylists(userId, sessionType);
        res.json({ playlists });
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

/**
 * POST /api/meditation/playlists
 * Create custom playlist
 */
router.post('/playlists', async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            sessionType,
            trackIds,
            duration,
            bpmRange,
            createdBy,
            isPublic = false
        } = req.body;

        if (!name || !sessionType || !trackIds || !createdBy) {
            return res.status(400).json({
                error: 'Missing required fields: name, sessionType, trackIds, createdBy'
            });
        }

        const playlistId = await meditationService.createPlaylist({
            name,
            description,
            sessionType,
            trackIds,
            duration: duration || 20,
            bpmRange: bpmRange || { min: 80, max: 100 },
            createdBy,
            isOfficial: false,
            isPublic
        });

        res.status(201).json({
            success: true,
            playlistId,
            message: 'Playlist created successfully'
        });
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

/**
 * GET /api/meditation/music/recommended
 * Get recommended music for meditation
 */
router.get('/music/recommended', async (req: Request, res: Response) => {
    try {
        const mood = req.query.mood as string || 'peaceful';
        const bpmPreference = (req.query.bpmPreference as 'slow' | 'medium' | 'energetic') || 'medium';

        const tracks = await meditationService.getRecommendedMusic(mood, bpmPreference);

        res.json({
            tracks,
            count: tracks.length
        });
    } catch (error) {
        console.error('Error fetching recommended music:', error);
        res.status(500).json({ error: 'Failed to fetch recommended music' });
    }
});

export default router;
