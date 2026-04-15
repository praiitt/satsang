import { Router } from 'express';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { runInstagramScrape } from '../services/scrapers/instagram-scraper.js';
import { runYoutubeScrape } from '../services/scrapers/youtube-scraper.js';
import admin from 'firebase-admin';

const router = Router();
const COLLECTION = 'leads';

// ─── LEAD CRUD ──────────────────────────────────────────────────────────────

/**
 * GET /leads - List leads with filters
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const { platform, status, language, minScore, limit: limitStr, offset: offsetStr } = (req.query || {}) as Record<string, string>;

        const limit = Math.min(parseInt(limitStr || '50'), 200);
        const offset = parseInt(offsetStr || '0');

        let query: FirebaseFirestore.Query = db.collection(COLLECTION).orderBy('discoveredAt', 'desc');

        if (platform && platform !== 'all') query = query.where('platform', '==', platform);
        if (status && status !== 'all') query = query.where('status', '==', status);
        if (language && language !== 'all') query = query.where('language', '==', language);
        if (minScore) query = query.where('poetScore', '>=', parseInt(minScore));

        const countSnap = await query.count().get();
        const total = countSnap.data().count;

        const snap = await query.offset(offset).limit(limit).get();
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ items, total, limit, offset });
    } catch (e: any) {
        console.error('[leads] list error:', e);
        return res.status(500).json({ error: 'Failed to list leads', details: e.message });
    }
});

/**
 * GET /leads/:id - Get a single lead
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const doc = await db.collection(COLLECTION).doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });
        return res.json({ id: doc.id, ...doc.data() });
    } catch (e: any) {
        return res.status(500).json({ error: 'Failed to fetch lead', details: e.message });
    }
});

/**
 * POST /leads - Create a lead manually
 */
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const db = getDb();
        const body = req.body ?? {};
        const now = Date.now();

        if (!body.name || !body.platform) {
            return res.status(400).json({ error: 'name and platform are required' });
        }

        const lead = {
            name: String(body.name),
            handle: body.handle || '',
            platform: body.platform,
            profileUrl: body.profileUrl || '',
            language: body.language || 'hindi',
            location: body.location || '',
            // Contact
            phone: body.phone || null,
            whatsappUrl: body.whatsappUrl || null,
            email: body.email || null,
            website: body.website || null,
            youtubeChannel: body.youtubeChannel || null,
            facebookPage: body.facebookPage || null,
            twitterHandle: body.twitterHandle || null,
            linktreeUrl: body.linktreeUrl || null,
            bestContactMethod: body.bestContactMethod || 'dm',
            // Content
            samplePoem: body.samplePoem || '',
            tags: Array.isArray(body.tags) ? body.tags : [],
            // Scoring
            poetScore: body.poetScore || 0,
            status: 'new',
            notes: '',
            sampleGenerated: false,
            sampleUrl: null,
            // Timestamps
            discoveredAt: now,
            contactedAt: null,
            convertedAt: null,
            createdBy: req.user!.uid,
        };

        const docRef = await db.collection(COLLECTION).add(lead);
        return res.json({ id: docRef.id, ...lead });
    } catch (e: any) {
        console.error('[leads] create error:', e);
        return res.status(500).json({ error: 'Failed to create lead', details: e.message });
    }
});

/**
 * PATCH /leads/:id - Update a lead (status, notes, contact info, etc.)
 */
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const allowedFields = [
            'status', 'notes', 'phone', 'whatsappUrl', 'email', 'website',
            'bestContactMethod', 'tags', 'language', 'location', 'samplePoem',
            'poetScore', 'name', 'handle', 'profileUrl', 'isFavorite'
        ];
        const patch: Record<string, any> = { updatedAt: Date.now() };
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) patch[field] = req.body[field];
        }

        // Handle status transitions
        if (patch.status === 'contacted' && !req.body.contactedAt) {
            patch.contactedAt = Date.now();
        }
        if (patch.status === 'converted' && !req.body.convertedAt) {
            patch.convertedAt = Date.now();
        }

        await db.collection(COLLECTION).doc(req.params.id).set(patch, { merge: true });
        const snap = await db.collection(COLLECTION).doc(req.params.id).get();
        return res.json({ id: snap.id, ...snap.data() });
    } catch (e: any) {
        return res.status(500).json({ error: 'Failed to update lead', details: e.message });
    }
});

/**
 * DELETE /leads/:id - Remove a lead
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        await db.collection(COLLECTION).doc(req.params.id).delete();
        return res.json({ success: true });
    } catch (e: any) {
        return res.status(500).json({ error: 'Failed to delete lead', details: e.message });
    }
});

// ─── SCRAPE TRIGGER ─────────────────────────────────────────────────────────

/**
 * POST /leads/scrape - Trigger a scrape job
 * Body: { source: 'instagram'|'youtube', hashtags?: string[], channelIds?: string[], language?: string }
 */
router.post('/scrape', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const { source, hashtags, channelIds, language = 'hindi' } = req.body;

        if (!source) {
            return res.status(400).json({ error: 'source is required (instagram | youtube)' });
        }

        // Respond immediately — scraping runs async
        res.json({ success: true, message: `Scrape job for ${source} started. Check /leads for results.` });

        // Run async — Cloud Run stays alive, no timeout issue
        if (source === 'instagram') {
            const seeds = hashtags || ['BhajanWriter', 'HindiPoetry', 'Shayari', 'SpiritualPoetry', 'MantraWriter'];
            runInstagramScrape({ hashtags: seeds, language }).catch(e =>
                console.error('[leads] Instagram scrape error:', e)
            );
        } else if (source === 'youtube') {
            const channels = channelIds || [
                'UCaayLD9i5x4MmIoVZxXSv_g', // T-Series Bhakti Sagar
                'UC7ZivIYRB0fMSGh-THcTYbw', // Shemaroo Bhakti
                'UCaF3MVnBYNnjAKF16k3mUjw', // Spiritual Mantra
                'UCvS5Fqf3kfv7F2DKeCpLzsQ', // Rajshri Soul
                'UC6vQRTCxutg6fJLUGkDKynQ', // Saregama Bhakti
            ];
            runYoutubeScrape({ 
                channelIds: channels, 
                language,
                maxVideosPerChannel: 50, // Search up to 50 recent videos per channel
                maxCommentsPerVideo: 200  // Get up to 200 top comments per video
            }).catch(e =>
                console.error('[leads] YouTube scrape error:', e)
            );
        } else {
            console.warn('[leads] Unknown source:', source);
        }

    } catch (e: any) {
        console.error('[leads] scrape trigger error:', e);
        return res.status(500).json({ error: 'Failed to start scrape', details: e.message });
    }
});

// ─── AI TAG GENERATION ──────────────────────────────────────────────────────

/**
 * POST /leads/generate-tags
 * Generate optimal hashtags or channel IDs using OpenAI based on user intent
 */
router.post('/generate-tags', requireAuth, async (req, res) => {
    try {
        const { prompt, platform } = req.body;
        if (!prompt) return res.status(400).json({ error: 'prompt is required' });

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

        let systemPrompt = '';
        if (platform === 'instagram') {
            systemPrompt = `You are an expert Instagram marketer for spiritual/poetry niches in India. Based on the user's intent, generate exactly 5-8 highly effective Instagram hashtags (without the # symbol, comma-separated) to find writers, singers, or poets matching their intent. Use a mix of broad and niche tags (e.g., HindiKavita, BhajanWriter, SadShayari). Output strictly the comma-separated words and nothing else.`;
        } else {
            systemPrompt = `You are an expert YouTube marketer for spiritual/poetry niches in India. Based on the user's intent, provide exactly 4-6 major Indian YouTube Channel handles (like @TSeriesBhaktiSagar, @ShemarooBhakti, @MeditativeMind) that match their intent. Output strictly the comma-separated handles and nothing else.`;
        }

        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await openAiRes.json() as any;
        if (!openAiRes.ok) throw new Error(data.error?.message || 'OpenAI API failed');
        
        const content = data.choices?.[0]?.message?.content?.trim() || '';
        return res.json({ tags: content });
    } catch (e: any) {
        console.error('[leads] generate-tags error:', e);
        return res.status(500).json({ error: 'Failed to generate tags', details: e.message });
    }
});

// ─── SAMPLE GENERATION ──────────────────────────────────────────────────────

/**
 * POST /leads/:id/generate-sample
 * Generate a Suno music sample from the lead's poem
 */
router.post('/:id/generate-sample', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const doc = await db.collection(COLLECTION).doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });

        const lead = doc.data() as any;
        const poem = lead.samplePoem || req.body.poem;

        if (!poem) {
            return res.status(400).json({ error: 'No poem available on this lead. Add samplePoem first.' });
        }

        const SUNO_API_KEY = process.env.SUNO_API_KEY;
        if (!SUNO_API_KEY) return res.status(500).json({ error: 'SUNO_API_KEY not configured' });

        // Generate via Suno with spiritual music style
        const prompt = `Spiritual Indian devotional music, bhajan style, healing frequencies: "${poem.substring(0, 200)}"`;

        const sunoRes = await fetch('https://apibox.erweima.ai/api/v1/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUNO_API_KEY}` },
            body: JSON.stringify({
                prompt,
                customMode: false,
                instrumental: false,
                model: 'V3_5',
                callbackUrl: ''
            })
        });

        const sunoData = await sunoRes.json() as any;
        if (!sunoRes.ok) {
            return res.status(500).json({ error: 'Suno generation failed', details: sunoData });
        }

        const taskId = sunoData?.data?.taskId;

        // Update lead with pending sample
        await db.collection(COLLECTION).doc(req.params.id).set({
            sampleGenerated: true,
            sampleTaskId: taskId,
            sampleUrl: null,
            sampleStatus: 'generating',
            sampleGeneratedAt: Date.now(),
        }, { merge: true });

        return res.json({ success: true, taskId, message: 'Sample generation started. Poll for sampleUrl.' });
    } catch (e: any) {
        console.error('[leads] generate-sample error:', e);
        return res.status(500).json({ error: 'Failed to generate sample', details: e.message });
    }
});

// ─── WHATSAPP OUTREACH ───────────────────────────────────────────────────────

/**
 * POST /leads/:id/send-whatsapp
 * Send a personalized WhatsApp outreach message
 */
router.post('/:id/send-whatsapp', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const doc = await db.collection(COLLECTION).doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });

        const lead = doc.data() as any;
        const phone = lead.phone || req.body.phone;
        if (!phone) return res.status(400).json({ error: 'No phone number on this lead' });

        const sampleUrl = lead.sampleUrl || req.body.sampleUrl || '';
        const name = lead.name || 'Kavishwar';
        const poem = (lead.samplePoem || '').substring(0, 80);

        const message = req.body.message || 
            `Namaste ${name} ji! 🙏\n\nMujhe aapki kavita "${poem}..." bahut pasand aayi.\n\nMaine isse ek healing frequency track mein dhaal diya — suniye:\n${sampleUrl || '[link aata hai jald]'}\n\nYeh track aapka hai — berozgari ke liye use karein.\n\nKya aap apni aur kavitaon ko bhi bhajan ya mantra ke roop mein sunn'na chahenge? 🎵\n\n— RRAASI Team`;

        // Use Twilio or existing WhatsApp service
        const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            return res.status(500).json({ error: 'Twilio not configured' });
        }

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const formData = new URLSearchParams({
            From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            To: `whatsapp:${phone.startsWith('+') ? phone : '+91' + phone}`,
            Body: message
        });

        const twilioRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        const twilioData = await twilioRes.json() as any;

        if (!twilioRes.ok) {
            return res.status(500).json({ error: 'WhatsApp send failed', details: twilioData });
        }

        // Update lead status
        await db.collection(COLLECTION).doc(req.params.id).set({
            status: 'contacted',
            contactedAt: Date.now(),
            lastOutreach: { channel: 'whatsapp', sentAt: Date.now(), messageSid: twilioData.sid }
        }, { merge: true });

        return res.json({ success: true, messageSid: twilioData.sid });
    } catch (e: any) {
        console.error('[leads] send-whatsapp error:', e);
        return res.status(500).json({ error: 'Failed to send WhatsApp', details: e.message });
    }
});

// ─── STATS ───────────────────────────────────────────────────────────────────

/**
 * GET /leads/stats/overview
 */
router.get('/stats/overview', requireAuth, async (_req, res) => {
    try {
        const db = getDb();
        const col = db.collection(COLLECTION);

        const [total, contacted, converted, newLeads] = await Promise.all([
            col.count().get(),
            col.where('status', '==', 'contacted').count().get(),
            col.where('status', '==', 'converted').count().get(),
            col.where('status', '==', 'new').count().get(),
        ]);

        return res.json({
            total: total.data().count,
            contacted: contacted.data().count,
            converted: converted.data().count,
            new: newLeads.data().count,
        });
    } catch (e: any) {
        return res.status(500).json({ error: 'Failed to get stats', details: e.message });
    }
});

export default router;
