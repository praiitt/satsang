import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '12';

        // Construct Auth Server URL
        let AUTH_URL = process.env.AUTH_SERVER_URL || process.env.AUTH_SERVICE_URL;

        if (!AUTH_URL) {
            if (process.env.NODE_ENV === 'development') {
                AUTH_URL = 'http://localhost:4000';
            } else {
                AUTH_URL = 'https://satsang-auth-server-6ougd45dya-el.a.run.app';
            }
        }

        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';

        const url = new URL(`${AUTH_URL}/suno/community-tracks`);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        if (search) url.searchParams.append('search', search);
        if (category) url.searchParams.append('category', category);
        
        const urlString = url.toString();

        console.log(`[API Proxy] Fetching community tracks from: ${urlString}`);

        const response = await fetch(urlString, {
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
