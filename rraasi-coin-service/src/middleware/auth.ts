import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

/**
 * Auth middleware to verify Firebase JWT tokens
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No authorization token provided'
            });
            return;
        }

        const token = authHeader.split('Bearer ')[1];

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);

            // Attach user info to request
            (req as any).user = {
                uid: decodedToken.uid,
                email: decodedToken.email
            };

            next();
        } catch (error) {
            console.error('[AuthMiddleware] Token verification failed:', error);
            // Log the project ID being used for verification
            const apps = admin.apps;
            if (apps.length > 0) {
                console.log('[AuthMiddleware] Verification project:', (apps[0]?.options as any)?.projectId);
            }
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            });
        }

    } catch (error: any) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
}
