import { Router } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import axios from 'axios';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { sendEarlyAccessWelcomeEmail } from '../services/sendgrid.js';
import twilio from 'twilio';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();
const COLLECTION = 'facebook_leads';
const PASSWORD = 'EarlyFreeAccess';

const AUTH_SERVER_URL = () =>
  process.env.AUTH_SERVER_URL_INTERNAL ||
  process.env.AUTH_SERVER_URL ||
  'http://localhost:4000';

const WA_SERVICE_URL = () =>
  process.env.WHATSAPP_SERVICE_URL ||
  process.env.NEXT_PUBLIC_WA_SERVICE_URL ||
  'http://localhost:4002';

const INTERNAL_TOKEN = () => process.env.INTERNAL_SERVICE_TOKEN || '';

// Format phone for WhatsApp: ensure it starts with +countrycode
function formatPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  // If already has country code (starts with +), just strip non-digits
  if (raw.trim().startsWith('+')) return '+' + digits;
  // Indian numbers without country code
  if (digits.length === 10) return '+91' + digits;
  // Already has country code digits
  if (digits.length > 10) return '+' + digits;
  return null;
}

// Build WhatsApp welcome message — general/satsang
function buildWAMessage(name: string, email: string): string {
  const firstName = name?.split(' ')[0] || name || 'Friend';
  return `🙏 Namaste ${firstName} ji!

Congratulations! 🎉 You applied early and have been granted *FREE Early Access* to RRAASI — India's AI-powered spiritual platform.

✅ Your account is ready:
🔐 Login at: https://rraasi.com
📧 Email: ${email}
🔑 Password: ${PASSWORD}

What you get:
🧘 Live Satsang with spiritual gurus
🎵 AI Spiritual Music & Bhajans
🔮 Vedic Jyotish readings
🃏 Tarot & more

You're part of our founding community! 🌟
— RRAASI Team 🙏`;
}

// Build WhatsApp welcome message — music leads
function buildMusicWAMessage(name: string, email: string): string {
  const firstName = name?.split(' ')[0] || name || 'Friend';
  return `🎵 Namaste ${firstName} ji!

Congratulations! 🎉 You applied early and have been granted *FREE Early Access* to RRAASI Music — India's AI-powered spiritual music platform.

✅ Your account is ready:
🔐 Login at: https://rraasi.com
📧 Email: ${email}
🔑 Password: ${PASSWORD}

🎼 *Start creating your own soulful music right now:*
🔗 https://www.rraasi.com/rraasi-music

With RRAASI Music you can:
🎶 Create bhajans, kirtans & sufi music just by talking
🧘 Healing frequencies & guided meditations
🎤 No instruments needed — just your intention
🌙 AI composes personalized spiritual music for you

You're part of our founding music community! 🌟
— RRAASI Music Team 🙏`;
}

// ─── IMPORT CSV ──────────────────────────────────────────────────────────────

/**
 * POST /facebook-leads/import-csv
 * Upload & parse a Facebook CSV and store leads in Firestore.
 */
router.post('/import-csv', requireAuth, upload.single('file'), (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Read category from query param first (reliable) — FormData text fields can be dropped by multer
  const category = ((req.query?.category as string) || req.body?.category || 'general').toLowerCase();
  console.log(`[facebook-leads] import-csv — category: "${category}"`);
  const results: any[] = [];
  const stream = Readable.from(req.file.buffer.toString('utf-8'));

  stream
    .pipe(csvParser())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      try {
        const db = getDb();
        const now = Date.now();
        const created: any[] = [];
        const skipped: any[] = [];

        for (const row of results) {
          const name = (row['Name'] || row['name'] || '').trim();
          const email = (row['Email'] || row['email'] || '').trim().toLowerCase();
          const phone = formatPhone(row['Phone'] || row['phone'] || row['WhatsApp number'] || '');

          if (!email && !phone) {
            skipped.push({ name, reason: 'no email or phone' });
            continue;
          }

          // Dedup by email
          let isDuplicate = false;
          let existingDocId: string | null = null;
          let existingCategory: string | null = null;

          if (email) {
            const existing = await db.collection(COLLECTION)
              .where('email', '==', email)
              .limit(1)
              .get();
            if (!existing.empty) {
              isDuplicate = true;
              existingDocId = existing.docs[0].id;
              existingCategory = existing.docs[0].data().category || null;
            }
          }

          // Dedup by phone (even if email was unique)
          if (!isDuplicate && phone) {
            const existing = await db.collection(COLLECTION)
              .where('phone', '==', phone)
              .limit(1)
              .get();
            if (!existing.empty) {
              isDuplicate = true;
              existingDocId = existing.docs[0].id;
              existingCategory = existing.docs[0].data().category || null;
            }
          }

          if (isDuplicate) {
            // If the existing lead has no category (or 'general') and we now have a real category, update it
            const needsCategoryUpdate = existingDocId &&
              category && category !== 'general' &&
              (!existingCategory || existingCategory === 'general');

            if (needsCategoryUpdate) {
              await db.collection(COLLECTION).doc(existingDocId!).update({ category });
              skipped.push({ name, email, phone, reason: 'duplicate — category updated' });
            } else {
              skipped.push({ name, email, phone, reason: 'duplicate' });
            }
            continue;
          }

          const lead = {
            name,
            email: email || null,
            phone: phone || null,
            source: 'facebook_leads',
            category,
            status: 'new',
            registeredInAuth: false,
            waSent: false,
            emailSent: false,
            discoveredAt: now,
            createdBy: req.user!.uid,
          };

          const docRef = await db.collection(COLLECTION).add(lead);
          created.push({ id: docRef.id, ...lead });
        }

        return res.json({
          success: true,
          imported: created.length,
          skipped: skipped.length,
          skippedItems: skipped,   // includes reason so frontend can show category-updated count
          items: created,
        });
      } catch (e: any) {
        console.error('[facebook-leads] CSV import error:', e);
        return res.status(500).json({ error: 'Import failed', details: e.message });
      }
    })
    .on('error', (e) => {
      return res.status(500).json({ error: 'CSV parse error', details: e.message });
    });
});

// ─── LIST ────────────────────────────────────────────────────────────────────

/**
 * GET /facebook-leads
 * Supports query params:
 *   ?search=<name|email|phone>  — server-side search across all records
 *   ?category=<satsang|music|general|all>  — filter by category
 *   ?limit=<n>  — max records to return (default 500, max 2000)
 *   ?offset=<n>  — pagination offset
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const category = ((req.query.category as string) || '').trim().toLowerCase();
    const limitParam = Math.min(parseInt(req.query.limit as string) || 500, 2000);
    const offsetParam = parseInt(req.query.offset as string) || 0;

    let query: FirebaseFirestore.Query = db.collection(COLLECTION).orderBy('discoveredAt', 'desc');

    // Category filter at DB level (exact match)
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }

    // Fetch all matching category docs (Firestore doesn't support full-text search)
    // We apply search filter in-memory after fetching
    const snap = await query.get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // Server-side search filter
    if (search) {
      items = items.filter(lead => {
        const name = (lead.name || '').toLowerCase();
        const email = (lead.email || '').toLowerCase();
        const phone = (lead.phone || '');
        return name.includes(search) || email.includes(search) || phone.includes(search);
      });
    }

    const total = items.length;
    const paginated = items.slice(offsetParam, offsetParam + limitParam);
    return res.json({ items: paginated, total, returned: paginated.length });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to list leads', details: e.message });
  }
});

// ─── CREATE MANUAL LEAD ──────────────────────────────────────────────────────

/**
 * POST /facebook-leads
 * Manually add a single lead (from form input).
 */
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { name, email, phone: rawPhone, category } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const emailClean = email?.trim().toLowerCase() || null;
    const phone = formatPhone(rawPhone || '') || null;
    const categoryClean = (category || 'general').toLowerCase();

    if (!emailClean && !phone) {
      return res.status(400).json({ error: 'At least one of email or phone is required' });
    }

    // Dedup by email
    if (emailClean) {
      const existing = await db.collection(COLLECTION)
        .where('email', '==', emailClean)
        .limit(1)
        .get();
      if (!existing.empty) {
        return res.status(409).json({ error: 'A lead with this email already exists' });
      }
    }

    // Dedup by phone
    if (phone) {
      const existing = await db.collection(COLLECTION)
        .where('phone', '==', phone)
        .limit(1)
        .get();
      if (!existing.empty) {
        return res.status(409).json({ error: 'A lead with this phone number already exists' });
      }
    }

    const lead = {
      name: name.trim(),
      email: emailClean,
      phone,
      source: 'manual',
      category: categoryClean,
      status: 'new',
      registeredInAuth: false,
      waSent: false,
      emailSent: false,
      discoveredAt: Date.now(),
      createdBy: req.user!.uid,
    };

    const docRef = await db.collection(COLLECTION).add(lead);
    return res.status(201).json({ id: docRef.id, ...lead });
  } catch (e: any) {
    console.error('[facebook-leads] create error:', e);
    return res.status(500).json({ error: 'Failed to create lead', details: e.message });
  }
});


// ─── REGISTER USER ───────────────────────────────────────────────────────────

/**
 * POST /facebook-leads/:id/register
 * Create a Firebase Auth user for this lead.
 */
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });

    const lead = doc.data() as any;
    if (!lead.email) return res.status(400).json({ error: 'Lead has no email' });
    if (lead.registeredInAuth) {
      return res.json({ success: true, alreadyExists: true, message: 'Already registered' });
    }

    const authRes = await axios.post(
      `${AUTH_SERVER_URL()}/admin/create-user`,
      { email: lead.email, displayName: lead.name, phone: lead.phone, password: PASSWORD },
      { headers: { 'x-internal-token': INTERNAL_TOKEN() } }
    );

    const { uid } = authRes.data;

    await db.collection(COLLECTION).doc(req.params.id).update({
      registeredInAuth: true,
      firebaseUid: uid,
      status: 'registered',
      registeredAt: Date.now(),
    });

    return res.json({ success: true, uid, alreadyExists: authRes.data.alreadyExists });
  } catch (e: any) {
    console.error('[facebook-leads] register error:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Registration failed', details: e.response?.data || e.message });
  }
});

// ─── GET CALL INTERACTIONS ────────────────────────────────────────────────────

/**
 * GET /facebook-leads/:id/interactions
 * Returns all call transcripts & analysis for a lead, ordered by newest first.
 */
router.get('/:id/interactions', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db
      .collection(COLLECTION)
      .doc(req.params.id)
      .collection('interactions')
      .orderBy('timestamp', 'desc')
      .get();

    const interactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ interactions });
  } catch (e: any) {
    console.error('[facebook-leads] interactions error:', e.message);
    return res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// ─── INITIATE VOBIZ CALL ───────────────────────────────────────────────────────

/**
 * POST /facebook-leads/:id/call
 * Initiate an outbound AI call via Vobiz API.
 */
router.post('/:id/call', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });

    const lead = doc.data() as any;
    if (!lead.phone) return res.status(400).json({ error: 'Lead has no phone number' });

    const VOBIZ_AUTH_ID = process.env.VOBIZ_AUTH_ID;
    const VOBIZ_AUTH_TOKEN = process.env.VOBIZ_AUTH_TOKEN;
    const VOBIZ_FROM_NUMBER = process.env.VOBIZ_FROM_NUMBER;

    if (!VOBIZ_AUTH_ID || !VOBIZ_AUTH_TOKEN || !VOBIZ_FROM_NUMBER) {
       return res.status(500).json({ error: 'Vobiz credentials not configured in environment' });
    }

    // Determine the host for our webhook (TwiML generator).
    // We MUST prioritize MARKETING_SERVER_URL because req.headers.host will be localhost from Next.js proxy!
    let publicHost = process.env.MARKETING_SERVER_URL?.replace('https://', '').replace('http://', '');
    if (!publicHost && req.headers.host) publicHost = req.headers.host;
    
    const twimlUrl = `https://${publicHost}/twilio-bot/twiml?leadId=${req.params.id}`;

    // Prepare JSON payload for Vobiz API
    const payload = {
      to: lead.phone,
      from: VOBIZ_FROM_NUMBER,
      answer_url: twimlUrl,
      record: true
    };

    // Make the explicit REST call to Vobiz API
    const callRes = await axios.post(
      `https://api.vobiz.ai/api/v1/Account/${VOBIZ_AUTH_ID}/Call`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${VOBIZ_AUTH_ID}:${VOBIZ_AUTH_TOKEN}`).toString('base64'),
        }
      }
    );

    await db.collection(COLLECTION).doc(req.params.id).update({
      callInitiatedAt: Date.now(),
      status: lead.status === 'new' ? 'contacted' : lead.status,
    });

    return res.json({ success: true, callData: callRes.data });
  } catch (e: any) {
    console.error('[facebook-leads] vobiz call error:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Call initiation failed', details: e.response?.data || e.message });
  }
});

// ─── SEND WHATSAPP ───────────────────────────────────────────────────────────

/**
 * POST /facebook-leads/:id/send-whatsapp
 * Send a welcome WhatsApp message to one lead.
 */
router.post('/:id/send-whatsapp', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });

    const lead = doc.data() as any;
    const phone = lead.phone;
    if (!phone) return res.status(400).json({ error: 'No phone number for this lead' });

    const isMusic = (lead.category || 'general').toLowerCase() === 'music';
    const message = isMusic
      ? buildMusicWAMessage(lead.name, lead.email || '')
      : buildWAMessage(lead.name, lead.email || '');

    const provider = req.body.provider || req.query.provider || 'web';

    if (provider === 'twilio') {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || '';
        await client.messages.create({
            body: message,
            from: twilioFrom.includes('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`,
            to: `whatsapp:${phone}`
        });
    } else {
        await axios.post(
          `${WA_SERVICE_URL()}/send`,
          { phone, message },
          { headers: { 'x-internal-token': INTERNAL_TOKEN() } }
        );
    }

    await db.collection(COLLECTION).doc(req.params.id).update({
      waSent: true,
      waSentAt: Date.now(),
      waFailed: false,
      waError: null,
      status: lead.status === 'new' ? 'contacted' : lead.status,
    });

    return res.json({ success: true, phone });
  } catch (e: any) {
    const errMsg = e.response?.data?.error || e.message;
    console.error('[facebook-leads] send-whatsapp error:', errMsg);
    // Persist failure to Firestore so we know it needs retry
    try {
      const db2 = getDb();
      await db2.collection(COLLECTION).doc(req.params.id).update({
        waFailed: true,
        waError: errMsg,
        waFailedAt: Date.now(),
      });
    } catch { /* ignore secondary failure */ }
    return res.status(500).json({ error: 'WhatsApp send failed', details: errMsg });
  }
});

// ─── SEND EMAIL ──────────────────────────────────────────────────────────────

/**
 * POST /facebook-leads/:id/send-email
 * Send a welcome email with credentials.
 */
router.post('/:id/send-email', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });

    const lead = doc.data() as any;
    if (!lead.email) return res.status(400).json({ error: 'No email for this lead' });

    await sendEarlyAccessWelcomeEmail({
      to: lead.email,
      name: lead.name,
      email: lead.email,
      password: PASSWORD,
      category: (lead.category || 'general').toLowerCase(),
    });

    await db.collection(COLLECTION).doc(req.params.id).update({
      emailSent: true,
      emailSentAt: Date.now(),
      emailFailed: false,
      emailError: null,
      status: lead.status === 'new' ? 'contacted' : lead.status,
    });

    return res.json({ success: true, email: lead.email });
  } catch (e: any) {
    const errMsg = e.message;
    console.error('[facebook-leads] send-email error:', errMsg);
    // Persist failure to Firestore
    try {
      const db2 = getDb();
      await db2.collection(COLLECTION).doc(req.params.id).update({
        emailFailed: true,
        emailError: errMsg,
        emailFailedAt: Date.now(),
      });
    } catch { /* ignore secondary failure */ }
    return res.status(500).json({ error: 'Email send failed', details: errMsg });
  }
});

// ─── BULK WHATSAPP (batched, SSE stream) ─────────────────────────────────────

/**
 * POST /facebook-leads/bulk-send-whatsapp
 * Sends WA welcome messages to multiple leads in batches of 10
 * with 45s inter-batch delay and 4s per-message delay.
 * Uses Server-Sent Events so the UI can show live progress.
 */
router.post('/bulk-send-whatsapp', requireAuth, async (req, res) => {
  const { leadIds, provider = 'web' } = req.body as { leadIds: string[], provider?: string };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds array is required' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const BATCH_SIZE = 10;
  const MSG_DELAY = 4000;   // 4s between messages in a batch
  const BATCH_DELAY = 45000; // 45s between batches

  let sent = 0;
  let failed = 0;
  let paused = false;

  // Listen for client disconnect to allow "pause" via disconnect
  req.on('close', () => { paused = true; });

  const db = getDb();
  const batches: string[][] = [];
  for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
    batches.push(leadIds.slice(i, i + BATCH_SIZE));
  }

  send({ type: 'start', total: leadIds.length, batches: batches.length });

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    if (paused) break;

    const batch = batches[bIdx];
    send({ type: 'batch_start', batch: bIdx + 1, totalBatches: batches.length, size: batch.length });

    for (let mIdx = 0; mIdx < batch.length; mIdx++) {
      if (paused) break;
      const leadId = batch[mIdx];

      try {
        const doc = await db.collection(COLLECTION).doc(leadId).get();
        if (!doc.exists) {
          send({ type: 'skip', leadId, reason: 'not found' });
          continue;
        }

        const lead = doc.data() as any;
        const phone = lead.phone;

        if (!phone) {
          send({ type: 'skip', leadId, name: lead.name, reason: 'no phone' });
          continue;
        }

        // Skip already successfully sent (unless it previously failed)
        if (lead.waSent && !lead.waFailed) {
          send({ type: 'skip', leadId, name: lead.name, reason: 'already sent' });
          continue;
        }

        const isMusic = (lead.category || 'general').toLowerCase() === 'music';
        const message = isMusic
          ? buildMusicWAMessage(lead.name, lead.email || '')
          : buildWAMessage(lead.name, lead.email || '');

        const sendWithRetry = async (attempt = 1): Promise<void> => {
          try {
            if (provider === 'twilio') {
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || '';
                await client.messages.create({
                    body: message,
                    from: twilioFrom.includes('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`,
                    to: `whatsapp:${phone}`
                });
            } else {
                await axios.post(
                  `${WA_SERVICE_URL()}/send`,
                  { phone, message },
                  { headers: { 'x-internal-token': INTERNAL_TOKEN() }, timeout: 30000 }
                );
            }
          } catch (err: any) {
             const statusCode = err.response?.status;
             const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
             if (attempt === 1 && (isNetworkError || statusCode === 500 || statusCode === 502)) {
               console.log(`[Bulk] WhatsApp service appears down or rebooting. Waiting 15s before retry...`);
               await new Promise(r => setTimeout(r, 15000));
               return sendWithRetry(attempt + 1);
             }
             throw err;
          }
        };

        await sendWithRetry();

        await db.collection(COLLECTION).doc(leadId).update({
          waSent: true,
          waSentAt: Date.now(),
          waFailed: false,
          waError: null,
          status: lead.status === 'new' ? 'contacted' : lead.status,
        });

        sent++;
        send({ type: 'sent', leadId, name: lead.name, phone, sent, failed, total: leadIds.length });
      } catch (e: any) {
        const errMsg = e.response?.data?.error || e.message;
        failed++;
        // Persist failure so we can retry just these
        await db.collection(COLLECTION).doc(leadId).update({
          waFailed: true,
          waError: errMsg,
          waFailedAt: Date.now(),
        }).catch(() => {});
        send({ type: 'error', leadId, error: errMsg, sent, failed, total: leadIds.length });
      }

      // Inter-message delay (skip after last message in last batch)
      if (mIdx < batch.length - 1) {
        await new Promise(r => setTimeout(r, MSG_DELAY));
      }
    }

    send({ type: 'batch_done', batch: bIdx + 1, sent, failed });

    // Inter-batch delay (skip after last batch)
    if (bIdx < batches.length - 1 && !paused) {
      send({ type: 'waiting', seconds: BATCH_DELAY / 1000, nextBatch: bIdx + 2 });
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  send({ type: 'complete', sent, failed, total: leadIds.length });
  res.end();
});

// ─── BULK EMAIL ──────────────────────────────────────────────────────────────

/**
 * POST /facebook-leads/bulk-send-email
 * Sends welcome emails to multiple leads (SSE streamed).
 */
router.post('/bulk-send-email', requireAuth, async (req, res) => {
  const { leadIds } = req.body as { leadIds: string[] };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const db = getDb();

  let sent = 0, failed = 0;
  send({ type: 'start', total: leadIds.length });

  for (const leadId of leadIds) {
    try {
      const doc = await db.collection(COLLECTION).doc(leadId).get();
      if (!doc.exists) { send({ type: 'skip', leadId, reason: 'not found' }); continue; }

      const lead = doc.data() as any;
      if (!lead.email) { send({ type: 'skip', leadId, name: lead.name, reason: 'no email' }); continue; }

      // Skip already successfully sent (unless it previously failed)
      if (lead.emailSent && !lead.emailFailed) {
        send({ type: 'skip', leadId, name: lead.name, reason: 'already sent' });
        continue;
      }

      await sendEarlyAccessWelcomeEmail({ to: lead.email, name: lead.name, email: lead.email, password: PASSWORD, category: (lead.category || 'general').toLowerCase() });

      await db.collection(COLLECTION).doc(leadId).update({
        emailSent: true, emailSentAt: Date.now(),
        emailFailed: false, emailError: null,
        status: lead.status === 'new' ? 'contacted' : lead.status,
      });

      sent++;
      send({ type: 'sent', leadId, name: lead.name, email: lead.email, sent, failed, total: leadIds.length });
    } catch (e: any) {
      const errMsg = e.message;
      failed++;
      await db.collection(COLLECTION).doc(leadId).update({
        emailFailed: true, emailError: errMsg, emailFailedAt: Date.now(),
      }).catch(() => {});
      send({ type: 'error', leadId, error: errMsg, sent, failed, total: leadIds.length });
    }

    // Small delay between emails to respect SendGrid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  send({ type: 'complete', sent, failed, total: leadIds.length });
  res.end();
});

// ─── BULK REGISTER ───────────────────────────────────────────────────────────

/**
 * POST /facebook-leads/bulk-register
 * Register all selected leads with Firebase Auth.
 */
router.post('/bulk-register', requireAuth, async (req, res) => {
  const { leadIds } = req.body as { leadIds: string[] };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const db = getDb();

  let done = 0, failed = 0;
  send({ type: 'start', total: leadIds.length });

  for (const leadId of leadIds) {
    try {
      const doc = await db.collection(COLLECTION).doc(leadId).get();
      if (!doc.exists) { send({ type: 'skip', leadId, reason: 'not found' }); continue; }

      const lead = doc.data() as any;
      if (!lead.email) { send({ type: 'skip', leadId, name: lead.name, reason: 'no email' }); continue; }
      if (lead.registeredInAuth) { 
        done++;
        send({ type: 'sent', leadId, name: lead.name, note: 'already registered', done, failed, total: leadIds.length }); 
        continue; 
      }

      const authRes = await axios.post(
        `${AUTH_SERVER_URL()}/admin/create-user`,
        { email: lead.email, displayName: lead.name, password: PASSWORD },
        { headers: { 'x-internal-token': INTERNAL_TOKEN() } }
      );

      await db.collection(COLLECTION).doc(leadId).update({
        registeredInAuth: true,
        firebaseUid: authRes.data.uid,
        status: 'registered',
        registeredAt: Date.now(),
      });

      done++;
      send({ type: 'sent', leadId, name: lead.name, uid: authRes.data.uid, done, failed, total: leadIds.length });
    } catch (e: any) {
      failed++;
      send({ type: 'error', leadId, error: e.response?.data?.error || e.message, done, failed, total: leadIds.length });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  send({ type: 'complete', done, failed, total: leadIds.length });
  res.end();
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to delete', details: e.message });
  }
});

// ─── META GRAPH API WEBHOOK ──────────────────────────────────────────────────

/**
 * GET /facebook-leads/webhook
 * Facebook calls this once to verify we own the endpoint.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[fb-webhook] ✅ Webhook verified by Facebook');
    return res.status(200).send(challenge);
  }
  console.warn('[fb-webhook] ❌ Verification failed — token mismatch or wrong mode');
  return res.status(403).json({ error: 'Verification failed' });
});

/**
 * POST /facebook-leads/webhook
 * Facebook sends this every time a lead submits a Lead Ad form.
 * Auto-flow: Save to Firestore → Register in Firebase Auth → Send welcome email
 */
router.post('/webhook', async (req, res) => {
  // Always respond 200 FIRST — Facebook retries if we take >20s
  res.sendStatus(200);

  const body = req.body;
  if (!body || body.object !== 'page') return;

  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'leadgen') continue;

      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      console.log(`[fb-webhook] 📥 New lead event — leadgen_id: ${leadgenId}`);

      try {
        // 1. Fetch full lead data from Meta Graph API
        const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
        if (!pageToken) {
          console.error('[fb-webhook] META_PAGE_ACCESS_TOKEN not set — cannot fetch lead data');
          continue;
        }

        const graphUrl = `https://graph.facebook.com/v21.0/${leadgenId}?fields=field_data,created_time,ad_id,form_id,ad_name,form_name&access_token=${pageToken}`;
        let leadData: any = {};
        let isTestLead = false;

        try {
          const res = await axios.get(graphUrl);
          leadData = res.data;
        } catch (apiErr: any) {
          console.error(`[fb-webhook] Graph API failed for leadgen_id ${leadgenId}:`, apiErr.response?.data || apiErr.message);
          // If the ID doesn't exist, it's likely a webhook test from the Meta App Dashboard
          if (apiErr.response?.data?.error?.code === 100) {
            console.log(`[fb-webhook] This appears to be a Meta Test Lead (${leadgenId}). Will save dummy data.`);
            isTestLead = true;
            leadData = {
              field_data: [
                { name: 'full_name', values: ['Test Lead'] },
                { name: 'email', values: [`test_${leadgenId}@example.com`] },
                { name: 'phone_number', values: ['+919999999999'] }
              ]
            };
          } else {
            // Other API error — we can't get lead data, but we should record the failure
            leadData = { error: apiErr.response?.data || apiErr.message };
          }
        }

        // 2. Parse field_data array into a flat map
        const fields: Record<string, string> = {};
        for (const f of (leadData.field_data || [])) {
          const key = (f.name || '').toLowerCase().replace(/ /g, '_');
          if (key) fields[key] = f.values?.[0] || '';
        }

        const firstName = fields['first_name'] || '';
        const lastName = fields['last_name'] || '';
        const name = (fields['full_name'] || `${firstName} ${lastName}`.trim() || `Meta Lead ${leadgenId}`).trim();
        const email = (fields['email'] || '').toLowerCase().trim() || null;
        const phone = formatPhone(
          fields['phone_number'] || fields['mobile_number'] || fields['phone'] || ''
        ) || null;
        const category = (process.env.META_LEAD_CATEGORY || 'general').toLowerCase();

        if (!email && !phone && !isTestLead) {
          console.warn(`[fb-webhook] Lead ${leadgenId} has no email or phone — skipping`);
          // Still save it as an incomplete lead so we know the webhook fired
        }

        // 3. Dedup by email then phone
        const db = getDb();
        let existingDocId: string | null = null;

        if (email) {
          const snap = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
          if (!snap.empty) existingDocId = snap.docs[0].id;
        }
        if (!existingDocId && phone) {
          const snap = await db.collection(COLLECTION).where('phone', '==', phone).limit(1).get();
          if (!snap.empty) existingDocId = snap.docs[0].id;
        }

        if (existingDocId) {
          console.log(`[fb-webhook] Duplicate lead (${email || phone}) — updating meta fields only`);
          await db.collection(COLLECTION).doc(existingDocId).update({
            metaLeadgenId: leadgenId,
            metaAdId: leadData.ad_id || null,
            metaFormId: leadData.form_id || null,
            metaAdName: leadData.ad_name || null,
          });
          continue;
        }

        // 4. Save new lead to Firestore
        const lead = {
          name,
          email,
          phone,
          source: 'facebook_webhook',
          category,
          status: 'new',
          registeredInAuth: false,
          waSent: false,
          emailSent: false,
          metaLeadgenId: leadgenId,
          metaAdId: leadData.ad_id || null,
          metaFormId: leadData.form_id || null,
          metaAdName: leadData.ad_name || null,
          metaFormName: leadData.form_name || null,
          discoveredAt: Date.now(),
        };

        const ref = await db.collection(COLLECTION).add(lead);
        const docId = ref.id;
        console.log(`[fb-webhook] ✅ Lead saved: ${docId} — ${name} (${email || phone})`);

        // 5. Auto-register in Firebase Auth (skip if no email)
        if (email) {
          try {
            const authRes = await axios.post(
              `${AUTH_SERVER_URL()}/admin/create-user`,
              { email, displayName: name, password: PASSWORD },
              { headers: { 'x-internal-token': INTERNAL_TOKEN() } }
            );
            const { uid, alreadyExists } = authRes.data;

            await db.collection(COLLECTION).doc(docId).update({
              registeredInAuth: true,
              firebaseUid: uid,
              status: 'registered',
              registeredAt: Date.now(),
            });
            console.log(`[fb-webhook] ✅ Registered in Firebase Auth: uid=${uid} (already=${alreadyExists})`);

            // 6. Auto-send welcome email
            try {
              await sendEarlyAccessWelcomeEmail({ 
                to: email as string, 
                name, 
                email: email as string, 
                category 
              });
              await db.collection(COLLECTION).doc(docId).update({
                emailSent: true,
                emailSentAt: Date.now(),
              });
              console.log(`[fb-webhook] ✅ Welcome email sent to ${email}`);
            } catch (emailErr: any) {
              console.error('[fb-webhook] Email send failed:', emailErr.message);
              await db.collection(COLLECTION).doc(docId).update({
                emailSent: false,
                emailError: emailErr.message,
              });
            }
          } catch (authErr: any) {
            console.error('[fb-webhook] Auth registration failed:', authErr.response?.data || authErr.message);
          }
        } else {
          console.log(`[fb-webhook] No email for ${name} — skipping registration & email`);
        }

      } catch (err: any) {
        console.error(`[fb-webhook] Error processing leadgen_id ${leadgenId}:`, err.response?.data || err.message);
      }
    }
  }
});

export default router;
