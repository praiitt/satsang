import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/**
 * POST /api/playlists/:playlistId/tracks
 * Add a track to a playlist
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ playlistId: string }> }
) {
    try {
        const headerList = await headers();
        const user = await getCurrentUser(headerList.get('cookie') || undefined);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { trackId } = body;

        if (!trackId) {
            return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const { playlistId } = await params;

        const playlistRef = db.collection('playlists').doc(playlistId);
        const playlistDoc = await playlistRef.get();

        if (!playlistDoc.exists) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        const playlistData = playlistDoc.data();

        // Verify ownership
        if (playlistData?.userId !== user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if track already exists
        const tracks = playlistData?.tracks || [];
        if (tracks.includes(trackId)) {
            return NextResponse.json({
                success: true,
                message: 'Track already in playlist'
            });
        }

        // Add track
        await playlistRef.update({
            tracks: admin.firestore.FieldValue.arrayUnion(trackId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Add Track to Playlist API] Error:', error);
        return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
    }
}

/**
 * DELETE /api/playlists/:playlistId/tracks?trackId=xxx
 * Remove a track from a playlist
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ playlistId: string }> }
) {
    try {
        const headerList = await headers();
        const user = await getCurrentUser(headerList.get('cookie') || undefined);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const trackId = searchParams.get('trackId');

        if (!trackId) {
            return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const { playlistId } = await params;

        const playlistRef = db.collection('playlists').doc(playlistId);
        const playlistDoc = await playlistRef.get();

        if (!playlistDoc.exists) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        const playlistData = playlistDoc.data();

        // Verify ownership
        if (playlistData?.userId !== user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Remove track
        await playlistRef.update({
            tracks: admin.firestore.FieldValue.arrayRemove(trackId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Remove Track from Playlist API] Error:', error);
        return NextResponse.json({ error: 'Failed to remove track' }, { status: 500 });
    }
}
