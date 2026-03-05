import { NextResponse } from 'next/server';
import { getRandomMeditationTrack } from '@/lib/services/musicService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/satsang/music
 * Fetch a random track from music_tracks with tags 'meditation' or 'healing'
 */
export async function GET() {
    try {
        const randomTrack = await getRandomMeditationTrack();

        if (!randomTrack) {
            return NextResponse.json(
                { error: 'No music tracks available' },
                { status: 404 }
            );
        }

        return NextResponse.json(randomTrack);

    } catch (error: any) {
        console.error('[Satsang Music API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
