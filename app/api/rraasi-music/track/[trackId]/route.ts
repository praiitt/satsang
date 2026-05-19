import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rraasi-music/track/[trackId]
 * Fetch a single track's latest data from Firestore (for polling video status).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    await initAdmin();
    const db = getFirestore();
    const { trackId } = await params;

    if (!trackId) {
      return NextResponse.json({ error: 'trackId required' }, { status: 400 });
    }

    // Authenticate
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

    const snap = await db.collection('music_tracks').doc(trackId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.userId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return only the fields the card cares about for video status
    return NextResponse.json({
      id: snap.id,
      videoUrl: data.videoUrl || null,
      videoStatus: data.videoStatus || null,
      videoGenerating: data.videoGenerating || false,
    });
  } catch (error) {
    console.error('Error fetching single track:', error);
    return NextResponse.json({ error: 'Failed to fetch track' }, { status: 500 });
  }
}
