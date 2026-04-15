import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
        }

        const body = await req.json();
        const { trackIds, isPublic } = body;

        let AUTH_URL = process.env.AUTH_SERVER_URL || process.env.AUTH_SERVICE_URL;

        if (!AUTH_URL) {
            if (process.env.NODE_ENV === 'development') {
                AUTH_URL = 'http://localhost:4000';
            } else {
                AUTH_URL = 'https://satsang-auth-server-6ougd45dya-el.a.run.app';
            }
        }

        const url = `${AUTH_URL}/suno/publish/bulk`;

        console.log(`[API Proxy] Forwarding bulk publish toggle to: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({ trackIds, isPublic })
        });

        if (!response.ok) {
            console.error(`[API Proxy] Auth server error (bulk): ${response.status} ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || 'Failed to bulk publish tracks' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[API Proxy] Error proxying bulk publish request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
