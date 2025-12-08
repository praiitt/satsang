import { Router, Request, Response } from 'express';
import { getDb } from '../firebase';

const router = Router();

interface SunoCallbackPayload {
    taskId: string;
    status: string;
    clips?: Array<{
        id: string;
        title: string;
        audio_url: string;
        video_url?: string;
        image_url?: string;
        lyric?: string;
        created_at: string;
        model_name: string;
        status: string;
        gpt_description_prompt?: string;
        prompt?: string;
        style?: string;
        tags?: string;
    }>;
}

/**
 * POST /api/suno/callback
 * Receives callbacks from Suno API when music generation is complete
 */
router.post('/callback', async (req: Request, res: Response) => {
    try {
        const payload: SunoCallbackPayload = req.body;
        const userId = (req.query.userId as string) || 'default_user';

        console.log('[Suno Callback] Received callback:', JSON.stringify(payload, null, 2));
        console.log('[Suno Callback] UserId from query:', userId);

        // Validate payload
        if (!payload.taskId) {
            console.error('[Suno Callback] Missing taskId in payload');
            return res.status(400).json({ error: 'Missing taskId' });
        }

        // Only process successful completions
        if (payload.status === 'SUCCESS' && payload.clips && payload.clips.length > 0) {
            const db = getDb();
            const musicTracksRef = db.collection('music_tracks');

            // Save each clip to Firebase
            for (const clip of payload.clips) {
                if (clip.audio_url) {
                    const trackData = {
                        taskId: payload.taskId,
                        clipId: clip.id,
                        title: clip.title || 'Untitled',
                        audioUrl: clip.audio_url,
                        videoUrl: clip.video_url || null,
                        imageUrl: clip.image_url || null,
                        lyric: clip.lyric || null,
                        status: payload.status,
                        userId: userId,
                        createdAt: new Date(),
                        metadata: {
                            modelName: clip.model_name,
                            prompt: clip.prompt,
                            style: clip.style,
                            tags: clip.tags,
                            gptDescription: clip.gpt_description_prompt,
                        },
                    };

                    await musicTracksRef.add(trackData);
                    console.log(`[Suno Callback] Saved track: ${clip.title} (${clip.id}) for user: ${userId}`);
                }
            }

            console.log(`[Suno Callback] Successfully saved ${payload.clips.length} tracks for task ${payload.taskId}, user ${userId}`);
        } else {
            console.log(`[Suno Callback] Task ${payload.taskId} status: ${payload.status} - not saving`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true, taskId: payload.taskId });
    } catch (error) {
        console.error('[Suno Callback] Error processing callback:', error);
        // Still return 200 to prevent Suno from retrying
        res.status(200).json({ received: true, error: 'Internal error' });
    }
});

/**
 * GET /api/suno/tracks
 * Get music tracks for a user
 */
router.get('/tracks', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string || 'default_user';
        const limit = parseInt(req.query.limit as string) || 10;

        const db = getDb();
        const snapshot = await db
            .collection('music_tracks')
            .where('userId', '==', userId)
            .limit(limit)
            .get();

        // Sort in memory instead of using orderBy (which requires composite index)
        const tracks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a: any, b: any) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime; // Descending order
            });

        res.json({ tracks });
    } catch (error) {
        console.error('[Suno Tracks] Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

export default router;
