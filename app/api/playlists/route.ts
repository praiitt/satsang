import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/**
 * POST /api/playlists
 * Create a new playlist
 */
export async function POST(request: NextRequest) {
    try {
        const headerList = await headers();
        const user = await getCurrentUser(headerList.get('cookie') || undefined);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
        }

        const db = getAdminDb();

        const playlistData = {
            userId: user.uid,
            name,
            description: description || '',
            tracks: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('playlists').add(playlistData);

        return NextResponse.json({
            success: true,
            playlistId: docRef.id,
            playlist: { id: docRef.id, ...playlistData }
        });
    } catch (error) {
        console.error('[Create Playlist API] Error:', error);
        return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
    }
}
