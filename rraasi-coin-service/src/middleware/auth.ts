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
            console.error('Token verification failed:', error);
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
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
