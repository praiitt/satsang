import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';

const COIN_SERVICE_URL = process.env.NEXT_PUBLIC_COIN_SERVICE_URL || 'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rraasi-music/download-art
 * 
 * Coin-gated download of AI art images and videos.
 * Track owners download free; community users pay coins.
 * 
 * Body: { contentUrl: string, trackId: string, type: 'image' | 'video' | 'pack' }
 */
export async function POST(request: NextRequest) {
    try {
        await initAdmin();

        // 1. Verify auth
        let uid: string | null = null;
        try {
            const authHeader = request.headers.get('authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
                uid = decoded.uid;
            } else {
                const session = request.cookies.get('__session')?.value;
                if (session) {
                    const decoded = await getAuth().verifySessionCookie(session);
                    uid = decoded.uid;
                }
            }
        } catch { /* unauthenticated */ }

        if (!uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request body
        const body = await request.json();
        const { contentUrl, trackId, type } = body;

        if (!trackId || !type || !['image', 'video', 'pack'].includes(type)) {
            return NextResponse.json({ error: 'Missing required fields (trackId, type)' }, { status: 400 });
        }

        // 3. Fetch track from Firestore to check ownership and public status
        const db = getFirestore();
        const trackSnap = await db.collection('music_tracks').doc(trackId).get();

        if (!trackSnap.exists) {
            return NextResponse.json({ error: 'Track not found' }, { status: 404 });
        }

        const trackData = trackSnap.data()!;
        const isOwner = trackData.userId === uid;

        // Non-owners can only download from public tracks
        if (!isOwner && !trackData.isPublic) {
            return NextResponse.json({ error: 'This track is not publicly available' }, { status: 403 });
        }

        // 4. If not owner, check and deduct coins
        if (!isOwner) {
            const featureId = type === 'image' ? 'art_image_download'
                : type === 'video' ? 'art_video_download'
                : 'art_pack_download';

            // Deduct coins via internal endpoint (it checks balance internally)
            const deductRes = await fetch(`${COIN_SERVICE_URL}/internal/deduct`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
                },
                body: JSON.stringify({
                    userId: uid,
                    featureId,
                    metadata: { trackId, type, contentUrl: contentUrl || 'pack' },
                }),
            });

            const deductData = await deductRes.json();
            if (!deductData.success) {
                return NextResponse.json({
                    error: 'Insufficient coins',
                    requiredCoins: deductData.requiredCoins,
                    availableCoins: deductData.availableCoins,
                }, { status: 402 });
            }
        }

        // 5. Handle download based on type
        if (type === 'pack') {
            // Return all image URLs + video URL for client-side download
            const urls: string[] = [
                ...(trackData.generatedVideoImages || []),
                ...(trackData.videoUrl ? [trackData.videoUrl] : []),
            ];
            return NextResponse.json({ success: true, urls, isOwner });
        }

        // Single file download — proxy the content
        if (!contentUrl) {
            return NextResponse.json({ error: 'contentUrl is required for single downloads' }, { status: 400 });
        }

        // Validate the contentUrl is from our Firebase Storage
        const isValidUrl = contentUrl.includes('storage.googleapis.com/rraasi')
            || contentUrl.includes('firebasestorage.googleapis.com');
        if (!isValidUrl) {
            return NextResponse.json({ error: 'Invalid content URL' }, { status: 400 });
        }

        const fileRes = await fetch(contentUrl);
        if (!fileRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
        }

        const arrayBuffer = await fileRes.arrayBuffer();
        const ext = type === 'video' ? 'mp4' : 'jpg';
        const filename = `rraasi_art_${trackId.slice(0, 8)}.${ext}`;

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': type === 'video' ? 'video/mp4' : 'image/jpeg',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('[Download Art] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
