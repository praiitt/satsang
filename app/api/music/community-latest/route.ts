import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * GET /api/music/community-latest
 * Returns the 5 most recently completed public music tracks for the homepage.
 */
export async function GET() {
    try {
        const db = getAdminDb();
        let snap: any;

        try {
            snap = await db.collection('music_tracks')
                .where('status', '==', 'COMPLETED')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
        } catch {
            // Fallback without orderBy if index missing
            snap = await db.collection('music_tracks')
                .where('status', '==', 'COMPLETED')
                .limit(5)
                .get();
        }

        const tracks: any[] = [];
        snap.forEach((doc: any) => {
            const d = doc.data();
            const firstTrack = Array.isArray(d.tracks) ? d.tracks[0] : null;
            tracks.push({
                id: doc.id,
                title: d.title,
                style: d.style,
                musicCategory: d.musicCategory || d.category || 'Spiritual',
                audioUrl: firstTrack?.audioUrl || null,
                imageUrl: firstTrack?.imageUrl || firstTrack?.image_url || null,
                createdAt: d.createdAt?._seconds || d.createdAt?.seconds || null,
            });
        });

        return NextResponse.json({ success: true, tracks });
    } catch (error: any) {
        console.error('[community-latest] Error:', error.message);
        return NextResponse.json({ success: true, tracks: [] });
    }
}
