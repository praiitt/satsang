import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';

const getAuthServerUrl = () =>
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:4000'
        : (process.env.AUTH_SERVER_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app');

async function getCookieHeader() {
    const headerList = await headers();
    return headerList.get('cookie') || '';
}

/** GET /api/favorites — fetch user's favorite tracks */
export async function GET(req: NextRequest) {
    try {
        const cookieHeader = await getCookieHeader();
        const user = await getCurrentUser(cookieHeader || undefined);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const idsOnly = searchParams.get('idsOnly') === 'true';

        const endpoint = idsOnly ? '/suno/favorites/ids' : '/suno/favorites';
        const res = await fetch(`${getAuthServerUrl()}${endpoint}`, {
            headers: { Cookie: cookieHeader }
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        console.error('[Favorites API] GET error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** POST /api/favorites — add a track to favorites */
export async function POST(req: NextRequest) {
    try {
        const cookieHeader = await getCookieHeader();
        const user = await getCurrentUser(cookieHeader || undefined);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const res = await fetch(`${getAuthServerUrl()}/suno/favorites`, {
            method: 'POST',
            headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        console.error('[Favorites API] POST error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
