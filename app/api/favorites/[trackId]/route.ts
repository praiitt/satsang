import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';

const getAuthServerUrl = () =>
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:4000'
        : (process.env.AUTH_SERVER_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app');

/** DELETE /api/favorites/[trackId] — remove a track from favorites */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { trackId: string } }
) {
    try {
        const headerList = await headers();
        const cookieHeader = headerList.get('cookie') || '';
        const user = await getCurrentUser(cookieHeader || undefined);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { trackId } = params;
        const res = await fetch(`${getAuthServerUrl()}/suno/favorites/${trackId}`, {
            method: 'DELETE',
            headers: { Cookie: cookieHeader }
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        console.error('[Favorites API] DELETE error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
