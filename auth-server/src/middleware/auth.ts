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

const SESSION_COOKIE_NAME = 'fb_session';

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      phone_number: decoded.phone_number,
      claims: decoded,
    };
    next();
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
