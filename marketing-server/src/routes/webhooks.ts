import { Router } from 'express';
import { getDb } from '../firebase.js';

const router = Router();

/**
 * POST /webhooks/heygen
 * Receives video completion events from HeyGen.
 * 
 * HeyGen v2 webhook payload example:
 * {
 *   "event_type": "video_generate.success",
 *   "data": {
 *     "video_id": "...",
 *     "status": "completed",
 *     "video_url": "...",
 *     "thumbnail_url": "...",
 *     "metadata": { "type": "podcast", "jobId": "...", "turnIndex": 0 }
 *   }
 * }
 */
router.post('/heygen', async (req, res) => {
  try {
    const { event_type, data } = req.body ?? {};
    const metadata = data?.metadata || {};
    const videoId = data?.video_id || data?.id;
    const videoUrl = data?.video_url || data?.videoUrl;
    const error = data?.error;

    // eslint-disable-next-line no-console
    console.log(`[webhook] 📥 Received HeyGen event: ${event_type}`, { videoId, metadata });

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is missing in payload' });
    }

    const db = getDb();

    // 1. Handle Podcast Turn Updates
    if (metadata.type === 'podcast' && metadata.jobId) {
      const jobId = metadata.jobId;
      const turnIndex = parseInt(String(metadata.turnIndex), 10);

      // eslint-disable-next-line no-console
      console.log(`[webhook] Updating podcast job ${jobId}, turn ${turnIndex}`);

      const docRef = db.collection('marketing_podcasts').doc(jobId);
      const snap = await docRef.get();

      if (snap.exists) {
        const podcastData = snap.data();
        if (podcastData && Array.isArray(podcastData.turns)) {
          const updatedTurns = [...podcastData.turns];
          
          if (turnIndex >= 0 && turnIndex < updatedTurns.length) {
            updatedTurns[turnIndex] = {
              ...updatedTurns[turnIndex],
              status: event_type.includes('success') ? 'ready' : 'failed',
              videoUrl: videoUrl || updatedTurns[turnIndex].videoUrl || null,
            };

            // Calculate overall job status if needed
            const allReady = updatedTurns.every(t => t.status === 'ready');
            const anyFailed = updatedTurns.some(t => t.status === 'failed');
            const overallStatus = anyFailed ? 'failed' : (allReady ? 'ready' : 'processing');

            await docRef.update({
              turns: updatedTurns,
              status: overallStatus,
              updatedAt: new Date()
            });
            // eslint-disable-next-line no-console
            console.log(`[webhook] ✅ Updated podcast turn ${turnIndex} successfully`);
          }
        }
      }
    } 
    
    // 2. Handle Ad Variant Updates
    else if (metadata.type === 'ad' && metadata.briefId) {
      const { briefId, variantId } = metadata;
      
      // eslint-disable-next-line no-console
      console.log(`[webhook] Updating ad brief ${briefId}, variant ${variantId}`);

      const updateData: any = {
        videoStatus: event_type.includes('success') ? 'ready' : 'failed',
        videoUrl: videoUrl || null,
        updatedAt: Date.now()
      };
      if (data.thumbnail_url) {
        updateData.videoThumbnailUrl = data.thumbnail_url;
      }

      // Update variant if provided
      if (variantId) {
        await db.collection('ad_briefs').doc(briefId)
          .collection('variants').doc(variantId)
          .update(updateData);
      }

      // Update brief level status
      await db.collection('ad_briefs').doc(briefId).update({
        latestVideoStatus: updateData.videoStatus,
        latestVideoUrl: updateData.videoUrl || null,
        updatedAt: Date.now()
      });
      // eslint-disable-next-line no-console
      console.log(`[webhook] ✅ Updated ad briefing ${briefId} successfully`);
    }

    return res.json({ success: true });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[webhook] Error processing HeyGen event:', error);
    return res.status(500).json({ error: 'Failed to process webhook', details: error.message });
  }
});

export default router;
