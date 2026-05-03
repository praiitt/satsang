import { Router } from 'express';
import admin from 'firebase-admin';
import { getAuth, getDb } from '../firebase.js';

const router = Router();

// Internal token middleware
function requireInternalToken(req: any, res: any, next: any) {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * POST /admin/create-user
 * Creates a Firebase Auth user for a lead.
 * Body: { email, displayName, password }
 * Header: x-internal-token
 */
router.post('/create-user', requireInternalToken, async (req, res) => {
  try {
    const { email, displayName, password, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const auth = getAuth();

    // Check if user already exists
    try {
      const existing = await auth.getUserByEmail(email);
      return res.json({
        success: true,
        uid: existing.uid,
        alreadyExists: true,
        message: 'User already exists in Firebase Auth',
      });
    } catch (notFoundErr: any) {
      if (notFoundErr.code !== 'auth/user-not-found') throw notFoundErr;
    }

    // Create the user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      ...(phone ? { phoneNumber: phone } : {}),
      emailVerified: false,
    });

    // Set earlyAccess custom claim
    await auth.setCustomUserClaims(userRecord.uid, { earlyAccess: true });

    // Also create a user doc in Firestore
    const db = getDb();
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: displayName || email.split('@')[0],
      phone: phone || null,
      role: 'user',
      earlyAccess: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'facebook_lead',
    }, { merge: true });

    return res.json({
      success: true,
      uid: userRecord.uid,
      alreadyExists: false,
      message: `User created: ${email}`,
    });
  } catch (e: any) {
    console.error('[admin] create-user error:', e);
    return res.status(500).json({ error: 'Failed to create user', details: e.message });
  }
});

/**
 * POST /admin/bulk-create-users
 * Bulk create users from a list of leads.
 * Body: { leads: Array<{ email, displayName, password }> }
 */
router.post('/bulk-create-users', requireInternalToken, async (req, res) => {
  try {
    const { leads, password = 'EarlyFreeAccess' } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const results: any[] = [];
    const auth = getAuth();
    const db = getDb();

    for (const lead of leads) {
      const { email, displayName, phone } = lead;
      if (!email) {
        results.push({ email, success: false, error: 'Missing email' });
        continue;
      }

      try {
        // Check if user already exists
        try {
          const existing = await auth.getUserByEmail(email);
          results.push({ email, success: true, uid: existing.uid, alreadyExists: true });
          continue;
        } catch (notFoundErr: any) {
          if (notFoundErr.code !== 'auth/user-not-found') throw notFoundErr;
        }

        const userRecord = await auth.createUser({
          email,
          password,
          displayName: displayName || email.split('@')[0],
          ...(phone ? { phoneNumber: phone } : {}),
          emailVerified: false,
        });

        await auth.setCustomUserClaims(userRecord.uid, { earlyAccess: true });

        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email,
          displayName: displayName || email.split('@')[0],
          phone: phone || null,
          role: 'user',
          earlyAccess: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'facebook_lead',
        }, { merge: true });

        results.push({ email, success: true, uid: userRecord.uid, alreadyExists: false });
      } catch (e: any) {
        results.push({ email, success: false, error: e.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return res.json({ success: true, total: leads.length, succeeded, failed, results });
  } catch (e: any) {
    console.error('[admin] bulk-create-users error:', e);
    return res.status(500).json({ error: 'Failed to bulk create users', details: e.message });
  }
});

export default router;
