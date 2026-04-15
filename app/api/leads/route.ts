import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getMarketingUrl = () => process.env.MARKETING_SERVER_URL || 'http://localhost:4001';

function forwardHeaders(req: NextRequest) {
    const cookie = req.headers.get('cookie') || '';
    return { 'Cookie': cookie, 'Content-Type': 'application/json' };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(`${getMarketingUrl()}/leads${qs ? `?${qs}` : ''}`, {
        headers: forwardHeaders(req),
        cache: 'no-store', // Crucial to prevent Next.js aggressive fetch caching
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const res = await fetch(`${getMarketingUrl()}/leads`, {
        method: 'POST',
        headers: forwardHeaders(req),
        body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
