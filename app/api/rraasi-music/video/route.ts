import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function getUid(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await getAuth().verifyIdToken(token);
      return decoded.uid;
    }
    const sessionCookie = request.cookies.get('__session')?.value;
    if (sessionCookie) {
      const decoded = await getAuth().verifySessionCookie(sessionCookie);
      return decoded.uid;
    }
  } catch (e) {
    console.error('Auth error:', e);
  }
  return null;
}

/**
 * DELETE /api/rraasi-music/video?trackId=xxx
 * Clears the videoUrl and videoGenerating flag on a track the user owns.
 */
export async function DELETE(request: NextRequest) {
  try {
    await initAdmin();
    const db = getFirestore();
    const uid = await getUid(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trackId = request.nextUrl.searchParams.get('trackId');
    if (!trackId) return NextResponse.json({ error: 'trackId is required' }, { status: 400 });

    const trackRef = db.collection('music_tracks').doc(trackId);
    const snap = await trackRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    if (snap.data()?.userId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await trackRef.update({
      videoUrl: null,
      videoGenerating: false,
      videoGeneratingStartedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}

/**
 * PATCH /api/rraasi-music/video?trackId=xxx
 * Clears a stale video generation lock so the user can retry.
 * Blocked if the lock is less than 5 minutes old (still actively generating).
 */
export async function PATCH(request: NextRequest) {
  try {
    await initAdmin();
    const db = getFirestore();
    const uid = await getUid(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trackId = request.nextUrl.searchParams.get('trackId');
    if (!trackId) return NextResponse.json({ error: 'trackId is required' }, { status: 400 });

    const trackRef = db.collection('music_tracks').doc(trackId);
    const snap = await trackRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    if (snap.data()?.userId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Only allow clearing if it's actually stuck (not a fresh lock < 5 min)
    const startedAt = snap.data()?.videoGeneratingStartedAt?.toMillis?.() ?? 0;
    const lockAgeMinutes = (Date.now() - startedAt) / 60000;
    if (startedAt && lockAgeMinutes < 5) {
      return NextResponse.json(
        { error: 'Video is still actively generating, please wait a few more minutes.' },
        { status: 409 }
      );
    }

    await trackRef.update({
      videoGenerating: false,
      videoGeneratingStartedAt: null,
      videoStatus: 'failed',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing video lock:', error);
    return NextResponse.json({ error: 'Failed to clear lock' }, { status: 500 });
  }
}
