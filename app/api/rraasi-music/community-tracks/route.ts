import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '12';

        // Construct Auth Server URL
        // Use the same logic as next.config.ts or defaults
        const AUTH_URL = process.env.AUTH_SERVER_URL ||
            process.env.AUTH_SERVICE_URL ||
            'https://satsang-auth-server-6ougd45dya-el.a.run.app';

        const url = `${AUTH_URL}/suno/community-tracks?page=${page}&limit=${limit}`;

        console.log(`[API Proxy] Fetching community tracks from: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`[API Proxy] Auth server error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: 'Failed to fetch tracks from auth server' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[API Proxy] Error proxying community tracks request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
