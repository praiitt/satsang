import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';
export const dynamic = 'force-dynamic';

/**
 * GET /api/playlists/[playlistId]
 * Get playlist details with all tracks populated
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ playlistId: string }> }
) {
    try {
        const headerList = await headers();
        const user = await getCurrentUser(headerList.get('cookie') || undefined);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getAdminDb();
        const { playlistId } = await params;

        const playlistDoc = await db.collection('playlists').doc(playlistId).get();

        if (!playlistDoc.exists) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        const playlistData = playlistDoc.data();

        // Verify ownership
        if (playlistData?.userId !== user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch track details
        const trackIds = playlistData?.tracks || [];
        const tracks = [];

        if (trackIds.length > 0) {
            // Batch fetch tracks from music_tracks collection
            for (const trackId of trackIds) {
                const trackDoc = await db.collection('music_tracks').doc(trackId).get();
                if (trackDoc.exists) {
                    tracks.push({
                        id: trackDoc.id,
                        ...trackDoc.data(),
                    });
                }
            }
        }

        return NextResponse.json({
            id: playlistDoc.id,
            ...playlistData,
            tracks,
        });
    } catch (error) {
        console.error('[Playlist Details API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch playlist details' }, { status: 500 });
    }
}
