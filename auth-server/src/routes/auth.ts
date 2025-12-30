import { Router } from 'express';
import { getAuth } from '../firebase.js';
import {
  type AuthedRequest,
  SESSION_COOKIE_NAME,
  requireAuth,
  requireRole,
} from '../middleware/auth.js';

const router = Router();

// Health
router.get('/health', (_req, res) => res.json({ ok: true }));

// Check if phone number is registered (optional helper endpoint)
router.post('/check-phone', async (req, res) => {
  const { phoneNumber } = req.body ?? {};
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' });

  try {
    // Normalize phone number (remove spaces, ensure + prefix)
    const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const userRecord = await getAuth().getUserByPhoneNumber(normalized);
    return res.json({ exists: true, uid: userRecord.uid });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return res.json({ exists: false });
    }
    return res.status(500).json({ error: 'Failed to check phone number' });
  }
});

// Exchange Firebase ID token (from client phone auth) for a secure session cookie
router.post('/sessionLogin', async (req, res) => {
  const { idToken } = req.body ?? {};
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  const expiresIn = 1000 * 60 * 60 * 24 * 5; // 5 days
  try {
    const cookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    const decoded = await getAuth().verifySessionCookie(cookie);

    res.cookie(SESSION_COOKIE_NAME, cookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true, // Must be true for SameSite=None
      sameSite: 'none', // Allow cross-site usage (required for some proxy setups)
      path: '/',
    });
    return res.json({
      uid: decoded.uid,
      phone_number: decoded.phone_number,
      email: decoded.email,
      expiresIn,
    });
  } catch (e: any) {
    console.error('[auth] Session login error:', e);
    return res.status(401).json({
      error: 'Failed to create session',
      details: e.message || 'Invalid ID token',
    });
  }
});

// Clear session cookie
router.post('/sessionLogout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
});

// Get current user using session cookie
router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const userRecord = await getAuth().getUser(req.user!.uid);
  return res.json({
    uid: userRecord.uid,
    phoneNumber: userRecord.phoneNumber,
    email: userRecord.email,
    displayName: userRecord.displayName,
    photoURL: userRecord.photoURL,
    disabled: userRecord.disabled,
    claims: userRecord.customClaims ?? {},
  });
});

// Set custom claims (authorization). Example body: { uid, claims: { role: 'host' } }
router.post('/claims', requireAuth, requireRole('admin'), async (req, res) => {
  const { uid, claims } = req.body ?? {};
  if (!uid || typeof claims !== 'object') {
    return res.status(400).json({ error: 'uid and claims required' });
  }
  await getAuth().setCustomUserClaims(uid, claims);
  return res.json({ ok: true });
});

export default router;
