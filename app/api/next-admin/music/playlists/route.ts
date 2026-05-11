import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
    try {
        await initAdmin();
        const db = getFirestore();

        let snap: FirebaseFirestore.QuerySnapshot;
        try {
            // Requires composite index: type ASC + createdAt DESC
            snap = await db
                .collection('playlists')
                .where('type', '==', 'curated')
                .orderBy('createdAt', 'desc')
                .get();
        } catch {
            // Fallback: no orderBy (works without composite index)
            snap = await db
                .collection('playlists')
                .where('type', '==', 'curated')
                .get();
        }

        const playlists = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            // Sort in-memory by createdAt descending as fallback
            .sort((a: any, b: any) => {
                const aTime = a.createdAt?._seconds ?? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() / 1000 : 0);
                const bTime = b.createdAt?._seconds ?? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() / 1000 : 0);
                return bTime - aTime;
            });

        return NextResponse.json({ playlists });
    } catch (error) {
        console.error('[Admin Curated Playlists GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch curated playlists' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await initAdmin();
        const db = getFirestore();
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
        }

        const playlistData = {
            name: body.name,
            description: body.description || '',
            imageUrl: body.imageUrl || null,
            category: body.category || 'General', // Shiva, Krishna, etc.
            tracks: body.tracks || [],
            type: 'curated',
            isPublic: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('playlists').add(playlistData);

        return NextResponse.json({
            message: 'Curated playlist created successfully',
            playlist: { id: docRef.id, ...body, type: 'curated', isPublic: true }
        });
    } catch (error) {
        console.error('[Admin Curated Playlists POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create curated playlist' }, { status: 500 });
    }
}
