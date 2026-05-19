import type { NextFunction, Request, Response } from 'express';
import { getAuth } from '../firebase.js';

export interface AuthedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    phone_number?: string;
    claims: Record<string, unknown>;
  };
}

const SESSION_COOKIE_NAME = '__session';

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    // 1. Internal service token (server-to-server)
    const internalToken = req.headers['x-internal-token'];
    if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
      req.user = {
        uid: (req.headers['x-internal-user-id'] as string) || 'system',
        claims: { role: 'admin' },
      };
      return next();
    }

    // 2. Bearer token (Firebase ID token — from rraasi-music or any cross-origin client)
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decoded = await getAuth().verifyIdToken(idToken);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        phone_number: decoded.phone_number,
        claims: decoded,
      };
      return next();
    }

    // 3. Session cookie (same-origin / admin dashboard)
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionCookie) {
      const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        phone_number: decoded.phone_number,
        claims: decoded,
      };
      return next();
    }

    return res.status(401).json({ error: 'Not authenticated' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

export function requireRole(role: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const hasRole = Boolean((req.user?.claims as any)?.role === role);
    if (!hasRole) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export { SESSION_COOKIE_NAME };
