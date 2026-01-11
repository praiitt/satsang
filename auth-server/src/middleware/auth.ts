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

// Helper to get token from header
const getBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split('Bearer ')[1];
  }
  return null;
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (token) {
      // Verify ID Token (Bearer)
      const decoded = await getAuth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        phone_number: decoded.phone_number,
        claims: decoded,
      };
      return next();
    }

    // Fallback to Session Cookie
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
    console.error('Auth Error:', err);
    return res.status(401).json({ error: 'Invalid session/token' });
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
