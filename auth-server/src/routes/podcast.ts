import { Router } from 'express';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { createAvatarClip, getAvatarClipStatus, healthCheck } from '../services/heygen.js';
import { stitchVideos } from '../services/video-stitcher.js';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

type SpeakerRole = 'host' | 'guest';

interface TurnInput {
  speaker: SpeakerRole;
  text: string;
}

interface TurnRecord extends TurnInput {
  index: number;
  heygenVideoId?: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'unknown';
  videoUrl?: string;
}

interface PodcastJob {
  jobId: string;
  hostAvatarId: string;
  guestAvatarId: string;
  turns: TurnRecord[];
  status: 'queued' | 'processing' | 'ready' | 'failed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'marketing_podcasts';

/**
 * Save video locally to disk (skip GCS for now)
 */
async function saveVideoLocally(videoUrl: string, jobId: string, turnIndex: number): Promise<string> {
  const outputDir = path.resolve(process.cwd(), 'outputs', 'podcasts', jobId);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `turn-${turnIndex + 1}.mp4`;
  const filePath = path.join(outputDir, fileName);

  // Download video
  return new Promise((resolve, reject) => {
    https.get(videoUrl, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: Failed to download video`));
      }

      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        // eslint-disable-next-line no-console
        console.log(`[podcast] ✅ Video saved locally: ${filePath}`);
        resolve(filePath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete partial file on error
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * GET /podcast/health
 * Health check endpoint to test HeyGen API connectivity and list available avatars.
 * No authentication required (for diagnostics).
 */
router.get('/health', async (_req, res) => {
  try {
    const health = await healthCheck();
    const statusCode = health.success ? 200 : 503;
    return res.status(statusCode).json(health);
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[podcast] health check error', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error?.message || String(error),
    });
  }
});

function mapSpeakerToAvatar(
  speaker: SpeakerRole,
  hostAvatarId: string,
  guestAvatarId: string
): string {
  return speaker === 'host' ? hostAvatarId : guestAvatarId;
}

function normalizeStatusFromTurns(turns: TurnRecord[]): PodcastJob['status'] {
  if (turns.some((t) => t.status === 'failed')) return 'failed';
  if (turns.every((t) => t.status === 'ready')) return 'ready';
  if (turns.some((t) => t.status === 'processing' || t.status === 'queued')) {
    return 'processing';
  }
  return 'queued';
}

/**
 * Create a new two-avatar podcast job.
 *
 * POST /podcast
 *
 * Body:
 * {
 *   hostAvatarId: string,
 *   guestAvatarId: string,
 *   turns: [{ speaker: 'host' | 'guest', text: string }],
 *   options?: { ratio?: string, resolution?: string, voiceIdHost?: string, voiceIdGuest?: string }
 * }
 */
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const {
      hostAvatarId,
      guestAvatarId,
      turns,
      options,
    }: {
      hostAvatarId?: string;
      guestAvatarId?: string;
      turns?: TurnInput[];
      options?: {
        ratio?: string;
        resolution?: string;
        voiceIdHost?: string;
        voiceIdGuest?: string;
      };
    } = req.body ?? {};

    if (!hostAvatarId || !guestAvatarId) {
      return res.status(400).json({ error: 'hostAvatarId and guestAvatarId are required' });
    }
    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({ error: 'turns array is required and cannot be empty' });
    }

    // Basic validation and normalization of turns
    const normalizedTurns: TurnRecord[] = turns.map((t, index) => {
      const speaker = t.speaker === 'guest' ? 'guest' : 'host';
      const text = String(t.text || '').trim();
      return {
        index,
        speaker,
        text,
        status: 'queued',
      };
    });

    if (normalizedTurns.some((t) => !t.text)) {
      return res.status(400).json({ error: 'All turns must have non-empty text' });
    }

    // Create Firestore record first, then call HeyGen
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc();
    const now = new Date();
    const jobId = docRef.id;

    const baseJob: PodcastJob = {
      jobId,
      hostAvatarId,
      guestAvatarId,
      turns: normalizedTurns,
      status: 'queued',
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(baseJob);

    // Kick off HeyGen clip creation for each turn (in parallel)
    const ratio = options?.ratio;
    const resolution = options?.resolution;
    const voiceIdHost = options?.voiceIdHost;
    const voiceIdGuest = options?.voiceIdGuest;

      const createdTurns: TurnRecord[] = [];
    for (const turn of normalizedTurns) {
      const avatarId = mapSpeakerToAvatar(turn.speaker, hostAvatarId, guestAvatarId);
      const voiceId = turn.speaker === 'host' ? voiceIdHost : voiceIdGuest;

      const result = await createAvatarClip({
        avatarId,
        text: turn.text,
        ratio,
        resolution,
        voiceId,
      });

      // Only include heygenVideoId if it exists (Firestore doesn't allow undefined)
      const turnRecord: TurnRecord = {
        ...turn,
        status: result.success ? 'queued' : 'failed',
      };
      
      if (result.videoId) {
        turnRecord.heygenVideoId = result.videoId;
      }

      createdTurns.push(turnRecord);
    }

    const overallStatus = normalizeStatusFromTurns(createdTurns);
    await docRef.set(
      {
        turns: createdTurns,
        status: overallStatus,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.status(201).json({
      jobId,
      status: overallStatus,
      turns: createdTurns.map((t) => ({
        index: t.index,
        speaker: t.speaker,
        status: t.status,
        heygenVideoId: t.heygenVideoId,
      })),
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[podcast] create job error', error);
    return res.status(500).json({
      error: 'Failed to create podcast job',
      details: error?.message || String(error),
    });
  }
});

/**
 * Get status for a podcast job, including per-turn clip status.
 *
 * GET /podcast/:jobId
 */
router.get('/:jobId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(jobId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Podcast job not found' });
    }

    const data = snap.data() as PodcastJob;

    // Poll HeyGen for any turns that are not ready/failed yet
    // Note: HeyGen doesn't have a status endpoint, so we can't actually check status
    // Videos take 3-5 minutes to process. We'll just keep them as 'processing' 
    // until they're manually checked or we implement webhooks
    const updatedTurns: TurnRecord[] = [];
    const now = new Date();
    // Handle Firestore Timestamp or Date
    const createdAt =
      data.createdAt && typeof (data.createdAt as any).toDate === 'function'
        ? (data.createdAt as any).toDate()
        : data.createdAt instanceof Date
          ? data.createdAt
          : new Date(data.createdAt || now);
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    for (const turn of data.turns) {
      if (!turn.heygenVideoId || turn.status === 'ready' || turn.status === 'failed') {
        updatedTurns.push(turn);
        continue;
      }

      // HeyGen videos typically take 3-5 minutes, but can take up to 36 hours
      // Since there's no status API, we'll estimate based on elapsed time
      // After 5 minutes, mark as 'processing' (ready for manual check)
      // After 36 hours, mark as 'failed' (likely timeout)
      let status: TurnRecord['status'] = turn.status;
      let videoUrl = turn.videoUrl;

      if (elapsedMinutes >= 36 * 60) {
        // 36+ hours - likely failed
        status = 'failed';
      } else if (elapsedMinutes >= 5) {
        // 5+ minutes - likely ready (but can't verify without status API)
        // Keep as 'processing' but user can manually check
        status = 'processing';
      } else {
        // Less than 5 minutes - still processing
        status = 'processing';
      }

      // Try to check status via API (even though it likely won't work)
      try {
        const statusResult = await getAvatarClipStatus(turn.heygenVideoId);
        if (statusResult.success && statusResult.status === 'ready' && statusResult.videoUrl) {
          status = 'ready';
          videoUrl = statusResult.videoUrl;
        } else if (statusResult.success && statusResult.status === 'failed') {
          status = 'failed';
        }
      } catch (error) {
        // Status check failed - expected, since HeyGen has no status endpoint
        // Just continue with time-based estimation
      }

      // Only include videoUrl if it exists (Firestore doesn't allow undefined)
      const updatedTurn: TurnRecord = {
        ...turn,
        status,
      };
      if (videoUrl) {
        updatedTurn.videoUrl = videoUrl;
        
        // Save video locally (skip GCS for now)
        try {
          await saveVideoLocally(videoUrl, jobId, turn.index);
        } catch (saveError: any) {
          // eslint-disable-next-line no-console
          console.warn(`[podcast] Failed to save video locally for turn ${turn.index}:`, saveError.message);
          // Continue even if local save fails
        }
      }
      updatedTurns.push(updatedTurn);
    }

    const overallStatus = normalizeStatusFromTurns(updatedTurns);
    const updatedJob: Partial<PodcastJob> = {
      turns: updatedTurns,
      status: overallStatus,
      updatedAt: new Date(),
    };

    await docRef.set(updatedJob, { merge: true });

    return res.json({
      jobId: data.jobId,
      status: overallStatus,
      hostAvatarId: data.hostAvatarId,
      guestAvatarId: data.guestAvatarId,
      turns: updatedTurns.map((t) => ({
        index: t.index,
        speaker: t.speaker,
        status: t.status,
        heygenVideoId: t.heygenVideoId,
        videoUrl: t.videoUrl,
      })),
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[podcast] get job error', error);
    return res.status(500).json({
      error: 'Failed to get podcast job',
      details: error?.message || String(error),
    });
  }
});

/**
 * Manually update a turn's video URL (for when videos are ready in HeyGen dashboard)
 * 
 * PATCH /podcast/:jobId/turns/:turnIndex
 * 
 * Body: { videoUrl: string }
 */
router.patch('/:jobId/turns/:turnIndex', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { jobId, turnIndex } = req.params;
    const { videoUrl } = req.body as { videoUrl?: string };

    if (!jobId || turnIndex === undefined) {
      return res.status(400).json({ error: 'jobId and turnIndex are required' });
    }
    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ error: 'videoUrl is required and must be a string' });
    }

    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(jobId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Podcast job not found' });
    }

    const data = snap.data() as PodcastJob;
    const index = parseInt(turnIndex, 10);
    if (isNaN(index) || index < 0 || index >= data.turns.length) {
      return res.status(400).json({ error: 'Invalid turnIndex' });
    }

    // Update the specific turn
    const updatedTurns = [...data.turns];
    updatedTurns[index] = {
      ...updatedTurns[index],
      videoUrl,
      status: 'ready',
    };

    const overallStatus = normalizeStatusFromTurns(updatedTurns);
    await docRef.set(
      {
        turns: updatedTurns,
        status: overallStatus,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Save video locally
    try {
      await saveVideoLocally(videoUrl, jobId, index);
    } catch (saveError: any) {
      // eslint-disable-next-line no-console
      console.warn(`[podcast] Failed to save video locally for turn ${index}:`, saveError.message);
    }

    return res.json({
      success: true,
      turn: {
        index: updatedTurns[index].index,
        speaker: updatedTurns[index].speaker,
        status: updatedTurns[index].status,
        videoUrl: updatedTurns[index].videoUrl,
      },
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[podcast] update turn error', error);
    return res.status(500).json({
      error: 'Failed to update turn',
      details: error?.message || String(error),
    });
  }
});

/**
 * POST /podcast/:jobId/stitch
 * 
 * Stitch all ready video turns into a single video
 * Body: { videoUrls?: string[] } - Optional, if not provided, uses all ready turns from job
 */
router.post('/:jobId/stitch', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { jobId } = req.params;
    const { videoUrls } = req.body as { videoUrls?: string[] };

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(jobId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Podcast job not found' });
    }

    const data = snap.data() as PodcastJob;

    // Get video URLs - either from request body or from ready turns
    let urlsToStitch: string[] = [];
    
    if (videoUrls && Array.isArray(videoUrls) && videoUrls.length > 0) {
      urlsToStitch = videoUrls;
    } else {
      // Get all ready turns with video URLs
      urlsToStitch = data.turns
        .filter((turn) => turn.status === 'ready' && turn.videoUrl)
        .sort((a, b) => a.index - b.index) // Sort by index to maintain order
        .map((turn) => turn.videoUrl!)
        .filter(Boolean);
    }

    if (urlsToStitch.length === 0) {
      return res.status(400).json({ error: 'No video URLs available to stitch' });
    }

    // eslint-disable-next-line no-console
    console.log(`[podcast] Stitching ${urlsToStitch.length} videos for job ${jobId}`);

    // Stitch videos
    const outputDir = path.resolve(process.cwd(), 'outputs', 'podcasts', jobId);
    const outputFileName = `stitched_${jobId}_${Date.now()}.mp4`;
    
    const result = await stitchVideos({
      videoUrls: urlsToStitch,
      outputFileName,
      outputDir,
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to stitch videos',
        details: result.error,
      });
    }

    // Update job with stitched video URL
    const stitchedVideoUrl = result.outputUrl || `/outputs/podcasts/${jobId}/${outputFileName}`;
    
    await docRef.set(
      {
        stitchedVideoUrl,
        stitchedAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      outputPath: result.outputPath,
      outputUrl: stitchedVideoUrl,
      videoCount: urlsToStitch.length,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[podcast] stitch error', error);
    return res.status(500).json({
      error: 'Failed to stitch videos',
      details: error?.message || String(error),
    });
  }
});

export default router;


