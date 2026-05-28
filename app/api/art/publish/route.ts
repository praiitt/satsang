import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(token);
        const userId = decoded.uid;

        const { artId, isPublic } = await req.json();

        if (!artId) {
            return NextResponse.json({ error: 'artId is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const docRef = db.collection('spiritual_art').doc(artId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Art not found' }, { status: 404 });
        }

        const data = doc.data();
        if (data?.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await docRef.update({
            isPublic: !!isPublic,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, isPublic: !!isPublic });
    } catch (error: any) {
        console.error('[Publish Art API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
