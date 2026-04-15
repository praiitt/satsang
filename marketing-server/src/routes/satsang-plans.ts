import { Router } from 'express';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();
const COLLECTION = 'satsang_plans';

/**
 * GET /satsang-plans
 * List all Satsang Plans from Firestore
 * Query params: limit, offset
 */
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const limit = parseInt((req.query?.limit as string) || '50', 10);
    const offset = parseInt((req.query?.offset as string) || '0', 10);
    
    const db = getDb();
    const query = db.collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);
      
    const snapshot = await query.get();
    
    const plans = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Timestamps to ISO strings
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });

    return res.json({
      success: true,
      plans,
      count: plans.length,
    });
  } catch (error: any) {
    console.error('[satsang-plans] Error listing plans:', error);
    return res.status(500).json({
      error: 'Failed to list satsang plans',
      details: error?.message || String(error),
    });
  }
});

/**
 * GET /satsang-plans/:id
 * Get a specific Satsang Plan by ID
 */
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Satsang plan not found' });
    }

    const data = doc.data();
    return res.json({
      success: true,
      plan: {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[satsang-plans] Error fetching plan:', error);
    return res.status(500).json({
      error: 'Failed to fetch satsang plan',
      details: error?.message || String(error),
    });
  }
});

export default router;
