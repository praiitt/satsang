import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '50';
        const type = searchParams.get('type') || 'all';
        const search = searchParams.get('search') || '';

        const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
        
        const url = new URL(`${authServerUrl}/suno/public-art`);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        url.searchParams.append('type', type);
        if (search) url.searchParams.append('search', search);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Note: we might not need to forward cookies since it's a public endpoint,
            // but if we do in the future, we can add credentials: 'include'.
        });

        if (!response.ok) {
            console.error(`[Gallery API] Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            return NextResponse.json({ error: `Auth server error: ${text}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Gallery API] Exception:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gallery art' },
            { status: 500 }
        );
    }
}
