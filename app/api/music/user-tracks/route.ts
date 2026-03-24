import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const headerList = await headers();
        const cookieHeader = headerList.get('cookie');
        const user = await getCurrentUser(cookieHeader || undefined);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const isDev = process.env.NODE_ENV === 'development';
        const authServerUrl = isDev
            ? 'http://localhost:4000'
            : (process.env.AUTH_SERVER_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app');

        const url = `${authServerUrl}/suno/my-tracks?limit=${limit}`;

        const response = await fetch(url, {
            headers: {
                'Cookie': cookieHeader || ''
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch tracks from auth server');
        }

        const data = await response.json();

        // The auth server returns tracks in `data.tracks` but we need to flatten the arrays for the distribution UI
        const tracks = (data.tracks || []).flatMap((t: any) => {
            if (t.tracks && Array.isArray(t.tracks) && t.tracks.length > 0) {
                return t.tracks.map((sub: any, idx: number) => ({
                    id: sub.sunoId || `${t.id}_${idx}`,
                    shareId: t.id,
                    title: `${t.title || t.trackName || 'Untitled'} (${idx + 1})`,
                    audioUrl: sub.audioUrl || sub.audio_url,
                    imageUrl: sub.imageUrl || sub.sourceImageUrl || t.imageUrl || t.image_url || t.thumbnailUrl,
                    prompt: t.prompt,
                    category: t.category,
                    createdAt: t.createdAt || t.created_at,
                    videoUrl: t.videoUrl,
                    youtubeUrl: t.youtubeUrl,
                    youtubeId: t.youtubeId,
                    videoStatus: t.videoStatus,
                }));
            }
            return [{
                id: t.id || t.trackId,
                shareId: t.id || t.trackId,
                title: t.title || t.trackName || 'Untitled',
                audioUrl: t.audioUrl || t.audio_url,
                imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
                prompt: t.prompt,
                category: t.category,
                createdAt: t.createdAt || t.created_at,
                videoUrl: t.videoUrl,
                youtubeUrl: t.youtubeUrl,
                youtubeId: t.youtubeId,
                videoStatus: t.videoStatus,
            }];
        }).filter((t: any) => !!t.audioUrl);

        return NextResponse.json({ tracks });

    } catch (error) {
        console.error('Error fetching user tracks:', error);
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
    }
}
