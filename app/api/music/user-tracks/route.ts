
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        initAdmin();
        const db = getAdminDb();

        const snapshot = await db.collection('music_tracks')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const tracks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ tracks });
    } catch (error) {
        console.error('Error fetching user tracks:', error);
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
    }
}
