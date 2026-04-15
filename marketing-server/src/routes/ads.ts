import { Router } from 'express';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { generateAdContent, generateAdImage } from '../services/gemini.js';
import { generateDalleImage, generateAdContentGPT } from '../services/openai.js';
import { getBufferChannels, publishToBuffer, isBufferConfigured } from '../services/buffer-publish.js';
import { getUploadSignedUrl } from '../services/gcs-audio.js';

const router = Router();
const COLLECTION = 'ad_briefs';
const GCS_BUCKET = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'rraasi-agent-recordings';

// ─── BRIEF CRUD ───────────────────────────────────────────────────────────────

// Create or update an AdBrief
router.post('/briefs', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const body = req.body ?? {};
    const now = Date.now();
    const payload = {
      title: String(body.title || ''),
      topic: String(body.topic || ''),
      objective: body.objective,
      audience: body.audience ?? '',
      cta: String(body.cta || ''),
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 12) : [],
      channels: Array.isArray(body.channels) ? body.channels : [],
      tone: body.tone ?? 'inspirational',
      languages: Array.isArray(body.languages) ? body.languages : [body.language ?? 'english'],
      proposition: body.proposition ?? '',
      status: body.status ?? 'draft',
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
      notes: body.notes ?? '',
    };
    if (!payload.title || !payload.objective) {
      return res.status(400).json({ error: 'title and objective are required' });
    }
    const docRef = await db.collection(COLLECTION).add(payload);
    const snap = await docRef.get();
    return res.json({ id: docRef.id, ...snap.data() });
  } catch (e: any) {
    console.error('[ads] create brief error:', e);
    return res.status(500).json({ error: 'failed to create brief' });
  }
});

// Get a brief by id
router.get('/briefs/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'not_found' });
    return res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    return res.status(500).json({ error: 'failed to fetch brief' });
  }
});

// Patch a brief (shallow merge)
router.patch('/briefs/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const patch = { ...(req.body ?? {}), updatedAt: Date.now() };
    await db.collection(COLLECTION).doc(req.params.id).set(patch, { merge: true });
    const snap = await db.collection(COLLECTION).doc(req.params.id).get();
    return res.json({ id: snap.id, ...snap.data() });
  } catch (e) {
    return res.status(500).json({ error: 'failed to update brief' });
  }
});

// List briefs
router.get('/briefs', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    if (!db) throw new Error('Firestore DB not initialized');
    
    const limitNum = Math.min(parseInt(String(req.query?.limit ?? '20'), 10) || 20, 100);
    console.log(`[ads] Listing briefs for user: ${req.user?.uid}, limit: ${limitNum}`);
    
    const colRef = db.collection(COLLECTION);
    if (!colRef) throw new Error(`Collection "${COLLECTION}" not found`);
    
    const query = colRef.orderBy('createdAt', 'desc');
    if (!query) throw new Error('Failed to create query with orderBy');
    
    const snap = await query.limit(limitNum).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    console.log(`[ads] Successfully fetched ${items.length} briefs`);
    return res.json({ items });
  } catch (e: any) {
    console.error('[ads] list briefs error:', e);
    return res.status(500).json({ 
      error: 'failed to list briefs', 
      details: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    });
  }
});

// Delete a brief
router.delete('/briefs/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'failed to delete brief' });
  }
});

// ─── VARIANTS ─────────────────────────────────────────────────────────────────

// List variants for a brief
router.get('/briefs/:id/variants', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTION).doc(req.params.id).collection('variants').orderBy('createdAt', 'desc').limit(50).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'failed to list variants' });
  }
});

// Create a format variant manually
router.post('/briefs/:id/variants', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const briefId = req.params.id;
    const { type, ...spec } = req.body ?? {};
    if (!type) return res.status(400).json({ error: 'type is required' });
    const now = Date.now();
    const variant = { type, ...spec, status: spec.status ?? 'ready', createdAt: now };
    const ref = await db.collection(COLLECTION).doc(briefId).collection('variants').add(variant);
    const snap = await ref.get();
    return res.json({ id: ref.id, ...snap.data() });
  } catch (e: any) {
    console.error('[ads] create variant error:', e);
    return res.status(500).json({ error: 'failed to create variant' });
  }
});

// Delete a variant
router.delete('/briefs/:briefId/variants/:variantId', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.collection(COLLECTION).doc(req.params.briefId).collection('variants').doc(req.params.variantId).delete();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'failed to delete variant' });
  }
});

// Patch a variant (shallow merge)
router.patch('/briefs/:briefId/variants/:variantId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { briefId, variantId } = req.params;
    const patch = { ...(req.body ?? {}), updatedAt: Date.now() };
    await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).set(patch, { merge: true });
    const snap = await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).get();
    return res.json({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error('[ads] patch variant error:', e);
    return res.status(500).json({ error: 'failed to update variant' });
  }
});

// ─── AI GENERATION ────────────────────────────────────────────────────────────

/**
 * POST /briefs/:id/generate
 * Generate text content (captions, hooks, hashtags) using Gemini
 */
router.post('/briefs/:id/generate', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const briefId = req.params.id;

  try {
    const briefDoc = await db.collection(COLLECTION).doc(briefId).get();
    if (!briefDoc.exists) return res.status(404).json({ error: 'brief not found' });
    const brief = briefDoc.data() as Record<string, any>;

    const platform = req.body.platform || (Array.isArray(brief.channels) && brief.channels[0]) || 'instagram';
    const targetLanguages = brief.languages || [brief.language || 'english'];

    const variants = [];
    for (const lang of targetLanguages) {
      let content;
      let usedModel = 'gemini';

      try {
        content = await generateAdContent({
          topic: brief.topic || brief.title || 'Spiritual Satsang',
          objective: brief.objective || 'Awareness',
          audience: brief.audience || 'Spiritual seekers',
          cta: brief.cta || 'Download the Rraasi app',
          platform,
          tone: brief.tone || 'inspirational',
          language: lang,
        });
      } catch (geminiError) {
        console.warn(`[ads] Gemini failed for ${lang}, falling back to GPT:`, geminiError);
        try {
          content = await generateAdContentGPT({
            topic: brief.topic || brief.title || 'Spiritual Satsang',
            objective: brief.objective || 'Awareness',
            audience: brief.audience || 'Spiritual seekers',
            cta: brief.cta || 'Download the Rraasi app',
            platform,
            tone: brief.tone || 'inspirational',
            language: lang,
          });
          usedModel = 'gpt-4o';
        } catch (gptError) {
          console.error(`[ads] Both Gemini and GPT failed for ${lang}:`, gptError);
          throw new Error(`AI generation failed for language ${lang}. Both providers unavailable.`);
        }
      }

      // Save as a variant
      const now = Date.now();
      const variantRef = await db.collection(COLLECTION).doc(briefId).collection('variants').add({
        type: 'text',
        platform,
        language: lang,
        caption: content.caption,
        hashtags: content.hashtags,
        hooks: content.hooks,
        imagePrompt: content.imagePrompt,
        status: 'ready',
        createdAt: now,
        generatedBy: usedModel,
      });
      const snap = await variantRef.get();
      variants.push({ id: variantRef.id, ...snap.data() });
    }

    return res.json({ success: true, variants });
  } catch (e: any) {
    console.error('[ads] generate content error:', e);
    const status = e.status || 500;
    return res.status(status).json({ error: 'Failed to generate content', details: e.message });
  }
});

/**
 * POST /briefs/:id/generate-image
 * Generate an image using Gemini image generation and upload to GCS
 */
router.post('/briefs/:id/generate-image', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const briefId = req.params.id;

  try {
    const { imagePrompt, variantId } = req.body as { imagePrompt?: string; variantId?: string };

    let prompt = imagePrompt;
    if (!prompt && variantId) {
      // Get imagePrompt from existing variant
      const varSnap = await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).get();
      if (varSnap.exists) {
        prompt = (varSnap.data() as any).imagePrompt;
      }
    }

    // Fall back to brief topic
    if (!prompt) {
      const briefDoc = await db.collection(COLLECTION).doc(briefId).get();
      if (briefDoc.exists) {
        const brief = briefDoc.data() as any;
        prompt = `A beautiful, spiritual, culturally authentic image representing: ${brief.topic || brief.title}. Professional photography style, warm and inviting.`;
      }
    }
    if (!prompt) throw new Error("Could not determine image prompt");

    const provider = (req.body as any).provider || 'dalle';
    const result = provider === 'dalle'
      ? await generateDalleImage(prompt, briefId)
      : await generateAdImage(prompt, briefId);

    // Save image as a variant
    const now = Date.now();
    const variantRef = await db.collection(COLLECTION).doc(briefId).collection('variants').add({
      type: 'image',
      imageUrl: result.imageUrl,
      gcsPath: result.gcsPath,
      imagePrompt: prompt,
      status: 'ready',
      createdAt: now,
      generatedBy: provider === 'dalle' ? 'dalle-3' : 'gemini-imagen',
      linkedVariantId: variantId || null,
    });

    // If there's a linked text variant, update it with the image URL
    if (variantId) {
      await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).set(
        { imageUrl: result.imageUrl, imageVariantId: variantRef.id },
        { merge: true }
      );
    }

    return res.json({ success: true, imageUrl: result.imageUrl, variantId: variantRef.id });
  } catch (e: any) {
    console.error('[ads] generate image error:', e);
    const status = e.message?.includes('429') ? 429 : 500;
    return res.status(status).json({ error: 'Failed to generate image', details: e.message });
  }
});

/**
 * POST /briefs/:id/generate-upload-url
 * Generate a signed URL for uploading a file (image or video)
 */
router.post('/briefs/:id/generate-upload-url', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { fileName, contentType } = req.body;
    const briefId = req.params.id;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    // Determine target folder based on content type
    const isVideo = contentType.startsWith('video/');
    const folder = isVideo ? 'videos' : 'images';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const gcsPath = `ads/${briefId}/${folder}/${Date.now()}-${cleanFileName}`;

    const uploadUrl = await getUploadSignedUrl(gcsPath, contentType);
    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${gcsPath}`;

    return res.json({
      uploadUrl,
      publicUrl,
      gcsPath,
      isVideo,
    });
  } catch (e: any) {
    console.error('[ads] generate-upload-url error:', e);
    return res.status(500).json({ error: 'Failed to generate upload URL', details: e.message });
  }
});

// ─── BUFFER INTEGRATION ───────────────────────────────────────────────────────

/**
 * GET /buffer/channels
 * Get connected Buffer social media channels
 */
router.get('/buffer/channels', async (_req, res) => {
  try {
    if (!isBufferConfigured()) {
      return res.json({
        configured: false,
        channels: [],
        message: 'BUFFER_ACCESS_TOKEN not configured. Get your token at https://publish.buffer.com/settings/api',
      });
    }
    const channels = await getBufferChannels();
    return res.json({ configured: true, channels });
  } catch (e: any) {
    console.error('[ads] buffer channels error:', e);
    const status = e.message?.includes('401') ? 401 : e.message?.includes('403') ? 403 : 500;
    return res.status(status).json({ error: 'Failed to fetch Buffer channels', details: e.message });
  }
});

/**
 * POST /briefs/:id/publish
 * Publish a variant to social media via Buffer
 */
router.post('/briefs/:id/publish', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const briefId = req.params.id;

  try {
    if (!isBufferConfigured()) {
      return res.status(400).json({
        error: 'Buffer not configured',
        message: 'Add BUFFER_ACCESS_TOKEN to your environment. Get it at https://publish.buffer.com/settings/api',
      });
    }

    const { variantId, channelIds, scheduledAt } = req.body as {
      variantId: string;
      channelIds: string[];
      scheduledAt?: string;
    };

    if (!variantId || !channelIds?.length) {
      return res.status(400).json({ error: 'variantId and channelIds are required' });
    }

    const variantSnap = await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).get();
    if (!variantSnap.exists) return res.status(404).json({ error: 'variant not found' });
    const variant = variantSnap.data() as any;

    // Build post text: caption + hashtags
    let postText = variant.caption || '';
    if (variant.hashtags?.length) {
      postText += '\n\n' + variant.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
    }

    const mediaUrls = variant.imageUrl ? [variant.imageUrl] : [];
    const videoUrl = variant.videoUrl || null;

    const result = await publishToBuffer({
      channelIds,
      text: postText,
      mediaUrls,
      videoUrl,
      scheduledAt,
    });

    // Record publish action on the variant
    const now = Date.now();
    const updateData: any = {
      publishedToChannels: channelIds,
      bufferPostIds: result.postIds,
      publishStatus: result.success ? 'published' : (result.postIds?.length ? 'partial' : 'failed'),
      lastPublishError: result.success ? null : result.errors?.[0],
    };

    if (result.postIds?.length) {
      updateData.publishedAt = now;
    }

    await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).set(
      updateData,
      { merge: true }
    );

    return res.json(result);
  } catch (e: any) {
    console.error('[ads] publish error:', e);
    return res.status(500).json({ error: 'Failed to publish to Buffer', details: e.message });
  }
});


// ─── HEYGEN VIDEO GENERATION ──────────────────────────────────────────────────

// POST /ads/briefs/:id/generate-video
// Generates a HeyGen talking avatar video for an ad post variant
router.post('/briefs/:id/generate-video', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const briefId = req.params.id;
    const { variantId, avatarId, avatarType, voiceId, customScript } = req.body ?? {};

    // Get the brief
    const briefSnap = await db.collection(COLLECTION).doc(briefId).get();
    if (!briefSnap.exists) return res.status(404).json({ error: 'Brief not found' });
    const brief = briefSnap.data() as any;

    // Get the variant if provided, otherwise use brief data directly
    let caption = brief.topic || '';
    let hashtags: string[] = [];
    let targetVariantId = variantId;

    if (variantId) {
      const varSnap = await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).get();
      if (varSnap.exists) {
        const varData = varSnap.data() as any;
        caption = varData.caption || brief.topic;
        hashtags = varData.hashtags || [];
      }
    } else {
      // Auto-pick the latest text variant (order by createdAt only to avoid composite index)
      const varSnap = await db.collection(COLLECTION).doc(briefId).collection('variants')
        .orderBy('createdAt', 'desc').limit(5).get();
      const textVariants = varSnap.docs.filter(d => d.data().type === 'text');
      if (textVariants.length > 0) {
        const v = textVariants[0];
        targetVariantId = v.id;
        const vd = v.data() as any;
        caption = vd.caption || brief.topic;
        hashtags = vd.hashtags || [];
      }
    }

    // Refine caption into a clean spoken script (remove hashtags, make conversational)
    const hashtagPattern = /#\w+/g;
    let script = caption
      .replace(hashtagPattern, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // HeyGen has text limits
      
    // Use custom script if provided, overriding the auto-generated one
    if (customScript) {
      script = customScript.trim().substring(0, 500);
    }

    // Use env avatar/voice or fallback to provided param
    const resolvedAvatarId = avatarId || process.env.HEYGEN_AVATAR_ID || process.env.HEYGEN_TALKING_PHOTO_ID;
    const resolvedVoiceId = voiceId || process.env.TTS_VOICE_ID || process.env.HEYGEN_VOICE_ID;

    if (!resolvedAvatarId) {
      return res.status(400).json({ error: 'No avatar ID configured. Set HEYGEN_AVATAR_ID in environment.' });
    }

    const { createAvatarClip } = await import('../services/heygen.js');
    const result = await createAvatarClip({
      avatarId: resolvedAvatarId,
      avatarType: avatarType || 'avatar',
      text: script,
      voiceId: resolvedVoiceId,
      ratio: '16:9',
      resolution: '720p',
      metadata: {
        type: 'ad',
        briefId,
        variantId: targetVariantId
      }
    });

    if (!result.success || !result.videoId) {
      console.error('[ads] HeyGen video creation failed:', result.raw);
      return res.status(500).json({ error: 'HeyGen video creation failed', details: result.raw });
    }

    // Save video job info to the variant (or brief if no variant)
    const videoData = {
      videoId: result.videoId,
      videoStatus: result.videoUrl ? 'ready' : 'processing',
      videoUrl: result.videoUrl || null,
      videoScript: script,
      videoCreatedAt: Date.now(),
    };

    if (targetVariantId) {
      await db.collection(COLLECTION).doc(briefId).collection('variants').doc(targetVariantId).set(videoData, { merge: true });
    }
    // Also store at brief level for easy access
    await db.collection(COLLECTION).doc(briefId).set({ latestVideoId: result.videoId, latestVideoStatus: videoData.videoStatus }, { merge: true });

    return res.json({
      videoId: result.videoId,
      status: videoData.videoStatus,
      videoUrl: result.videoUrl || null,
      script,
      variantId: targetVariantId,
    });

  } catch (e: any) {
    console.error('[ads] generate-video error:', e);
    return res.status(500).json({ error: 'Failed to generate video', details: e.message });
  }
});

// GET /ads/briefs/:id/video-status?videoId=xxx
// Poll HeyGen video status and update Firestore when ready
router.get('/briefs/:id/video-status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const briefId = req.params.id;
    const { videoId, variantId } = (req.query || {}) as { videoId?: string; variantId?: string };

    if (!videoId) return res.status(400).json({ error: 'videoId query param required' });

    // Check Firestore first to see if the webhook already updated it
    const briefDoc = await db.collection(COLLECTION).doc(briefId).get();
    if (variantId) {
      const varDoc = await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).get();
      const varData = varDoc.data() as any;
      if (varDoc.exists && varData?.videoId === videoId && (varData?.videoStatus === 'ready' || varData?.videoStatus === 'failed')) {
        return res.json({
          videoId,
          status: varData.videoStatus,
          videoUrl: varData.videoUrl || null,
          thumbnailUrl: varData.videoThumbnailUrl || null,
        });
      }
    } else if (briefDoc.exists) {
      const briefData = briefDoc.data() as any;
      if (briefData?.latestVideoId === videoId && (briefData?.latestVideoStatus === 'ready' || briefData?.latestVideoStatus === 'failed')) {
        return res.json({
          videoId,
          status: briefData.latestVideoStatus,
          videoUrl: briefData.latestVideoUrl || null,
          thumbnailUrl: null, // Brief level might not have thumb
        });
      }
    }

    const { getAvatarClipStatus } = await import('../services/heygen.js');
    const status = await getAvatarClipStatus(videoId);

    // If ready or failed, update Firestore
    if (status.status === 'ready' && status.videoUrl) {
      const updateData = { videoStatus: 'ready', videoUrl: status.videoUrl, videoThumbnailUrl: status.thumbnailUrl || null, videoError: null };
      if (variantId) {
        await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).set(updateData, { merge: true });
      }
      await db.collection(COLLECTION).doc(briefId).set({ latestVideoStatus: 'ready', latestVideoUrl: status.videoUrl }, { merge: true });
    } else if (status.status === 'failed') {
      const updateData = { videoStatus: 'failed', videoError: status.error || 'Unknown error' };
      if (variantId) {
        await db.collection(COLLECTION).doc(briefId).collection('variants').doc(variantId).set(updateData, { merge: true });
      }
      await db.collection(COLLECTION).doc(briefId).set({ latestVideoStatus: 'failed' }, { merge: true });
    }

    return res.json({
      videoId,
      status: status.status,
      videoUrl: status.videoUrl || null,
      thumbnailUrl: status.thumbnailUrl || null,
      error: status.error, // Pass through the error message
    });

  } catch (e: any) {
    console.error('[ads] video-status error:', e);
    return res.status(500).json({ error: 'Failed to get video status', details: e.message });
  }
});

export default router;
