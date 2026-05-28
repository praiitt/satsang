import { NextResponse } from 'next/server';

// Use astrology_backend — it has the working x-astrologyapi-key credentials
const ASTROLOGY_BACKEND_URL = process.env.NEXT_PUBLIC_ASTROLOGY_BACKEND_URL || 'http://localhost:3002';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const language = req.headers.get('Accept-Language') || 'en';

        const res = await fetch(`${ASTROLOGY_BACKEND_URL}/api/tarot/predictions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': language,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || 'Tarot API error', details: data?.details || '' },
                { status: res.status }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json(
            { error: 'Failed to fetch tarot predictions', details: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
