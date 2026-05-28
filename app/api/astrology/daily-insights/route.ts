import { NextResponse } from 'next/server';

const ASTROLOGY_BACKEND_URL = process.env.NEXT_PUBLIC_ASTROLOGY_BACKEND_URL || 'http://localhost:3002';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.userId || !body.birthData) {
            return NextResponse.json(
                { success: false, error: 'Missing userId or birthData' },
                { status: 400 }
            );
        }

        const res = await fetch(`${ASTROLOGY_BACKEND_URL}/api/astrology/daily-insights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: data?.error || 'Astrology API error', details: data?.details || '' },
                { status: res.status }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch daily insights', details: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
