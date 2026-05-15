import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ playlistId: string }> }
) {
    try {
        await initAdmin();
        const db = getFirestore();
        const { playlistId } = await params;
        const body = await req.json();

        const updateData: any = {
            updatedAt: new Date().toISOString()
        };

        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.tracks !== undefined) updateData.tracks = body.tracks;

        await db.collection('playlists').doc(playlistId).update(updateData);

        return NextResponse.json({
            message: 'Playlist updated successfully'
        });
    } catch (error) {
        console.error('[Admin Curated Playlists PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ playlistId: string }> }
) {
    try {
        await initAdmin();
        const db = getFirestore();
        const { playlistId } = await params;

        await db.collection('playlists').doc(playlistId).delete();

        return NextResponse.json({
            message: 'Playlist deleted successfully'
        });
    } catch (error) {
        console.error('[Admin Curated Playlists DELETE] Error:', error);
        return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
    }
}
