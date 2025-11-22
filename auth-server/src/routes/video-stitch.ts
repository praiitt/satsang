import { Router } from 'express';
import path from 'node:path';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { stitchVideos } from '../services/video-stitcher.js';

const router = Router();

/**
 * POST /video-stitch
 *
 * Standalone video stitching endpoint - doesn't require a podcast job
 * Body: { videoUrls: string[] }
 */
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { videoUrls } = req.body as { videoUrls?: string[] };

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({ error: 'videoUrls array is required and must not be empty' });
    }

    if (videoUrls.length < 2) {
      return res.status(400).json({ error: 'At least 2 video URLs are required to stitch videos' });
    }

    // Filter out empty URLs
    const validUrls = videoUrls.filter(
      (url) => url && typeof url === 'string' && url.trim().length > 0
    );

    if (validUrls.length < 2) {
      return res.status(400).json({ error: 'At least 2 valid video URLs are required' });
    }

    // eslint-disable-next-line no-console
    console.log(`[video-stitch] Stitching ${validUrls.length} videos`);

    // Stitch videos
    const outputDir = path.resolve(process.cwd(), 'outputs', 'stitched');
    const timestamp = Date.now();
    const outputFileName = `stitched_${timestamp}.mp4`;

    const result = await stitchVideos({
      videoUrls: validUrls,
      outputFileName,
      outputDir,
    });

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('[video-stitch] Stitching failed:', result.error);
      return res.status(500).json({
        error: result.error || 'Failed to stitch videos',
        details: result.error,
      });
    }

    // Return the stitched video info
    const stitchedVideoUrl = result.outputUrl || `/outputs/stitched/${outputFileName}`;

    return res.json({
      success: true,
      outputPath: result.outputPath,
      outputUrl: stitchedVideoUrl,
      videoCount: validUrls.length,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[video-stitch] Error:', error);
    return res.status(500).json({
      error: 'Failed to stitch videos',
      details: error?.message || String(error),
    });
  }
});

export default router;
