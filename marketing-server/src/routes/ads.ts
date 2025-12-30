import { Router } from 'express';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

const COLLECTION = 'ad_briefs';

// Create or update an AdBrief
router.post('/briefs', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const body = req.body ?? {};

    const now = Date.now();
    const payload = {
      title: String(body.title || ''),
      topicId: body.topicId ?? null,
      objective: body.objective,
      audience: body.audience ?? {},
      proposition: body.proposition ?? {},
      hooks: Array.isArray(body.hooks) ? body.hooks.slice(0, 6) : [],
      cta: String(body.cta || ''),
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 12) : [],
      channels: Array.isArray(body.channels) ? body.channels : [],
      platformTargets: body.platformTargets ?? {},
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
    // eslint-disable-next-line no-console
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

// List briefs (basic pagination)
router.get('/briefs', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(limit).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'failed to list briefs' });
  }
});

// Create a format variant under a brief
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
    // eslint-disable-next-line no-console
    console.error('[ads] create variant error:', e);
    return res.status(500).json({ error: 'failed to create variant' });
  }
});

// List variants for a brief
router.get('/briefs/:id/variants', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTION).doc(req.params.id).collection('variants').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'failed to list variants' });
  }
});

export default router;
