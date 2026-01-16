import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * GET /api/playlists/:userId
 * Fetch all playlists for a user
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const headerList = await headers();
        const user = await getCurrentUser(headerList.get('cookie') || undefined);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure user can only access their own playlists
        const userId = params.userId;
        if (user.uid !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const db = getAdminDb();
        const playlistsSnapshot = await db
            .collection('playlists')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const playlists = playlistsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            trackCount: doc.data().tracks?.length || 0,
        }));

        return NextResponse.json({ playlists });
    } catch (error) {
        console.error('[Playlists API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }
}
