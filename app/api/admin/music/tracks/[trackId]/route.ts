import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';
export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ trackId: string }> }
) {
    try {
        await initAdmin();
        const db = getFirestore();
        const { trackId } = await params;
        const body = await request.json();

        if (!trackId) {
            return NextResponse.json({ error: 'Track ID required' }, { status: 400 });
        }

        const { isPublic } = body;
        if (typeof isPublic !== 'boolean') {
            return NextResponse.json({ error: 'isPublic boolean required' }, { status: 400 });
        }

        // Verify Auth Token to protect the API
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        try {
            await getAuth().verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const trackDoc = await db.collection('music_tracks').doc(trackId).get();
        if (!trackDoc.exists) {
            return NextResponse.json({ error: 'Track not found' }, { status: 404 });
        }

        await db.collection('music_tracks').doc(trackId).update({
            isPublic
        });

        return NextResponse.json({
            success: true,
            message: `Track marked as ${isPublic ? 'Public' : 'Private'}`
        });

    } catch (error) {
        console.error('Error updating track:', error);
        return NextResponse.json({ error: 'Failed to update track' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ trackId: string }> }
) {
    try {
        await initAdmin();
        const db = getFirestore();
        const storage = getStorage().bucket();
        const { trackId } = await params;

        if (!trackId) {
            return NextResponse.json(
                { error: 'Track ID required' },
                { status: 400 }
            );
        }

        // Get track document
        const trackDoc = await db.collection('music_tracks').doc(trackId).get();

        if (!trackDoc.exists) {
            return NextResponse.json(
                { error: 'Track not found' },
                { status: 404 }
            );
        }

        const trackData = trackDoc.data();

        // Delete files from Cloud Storage if they exist
        if (trackData?.audioUrl) {
            try {
                const audioFileName = trackData.audioUrl.split(`${storage.name}/`)[1];
                if (audioFileName) {
                    await storage.file(audioFileName).delete();
                }
            } catch (error) {
                console.warn('Failed to delete audio file:', error);
            }
        }

        if (trackData?.imageUrl) {
            try {
                const imageFileName = trackData.imageUrl.split(`${storage.name}/`)[1];
                if (imageFileName) {
                    await storage.file(imageFileName).delete();
                }
            } catch (error) {
                console.warn('Failed to delete image file:', error);
            }
        }

        // Delete track document from Firestore
        await db.collection('music_tracks').doc(trackId).delete();

        return NextResponse.json({
            success: true,
            message: 'Track deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting track:', error);
        return NextResponse.json(
            { error: 'Failed to delete track' },
            { status: 500 }
        );
    }
}
