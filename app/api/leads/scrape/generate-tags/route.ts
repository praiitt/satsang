import { NextRequest, NextResponse } from 'next/server';

const getMarketingUrl = () => process.env.MARKETING_SERVER_URL || 'http://localhost:4001';

function forwardHeaders(req: NextRequest) {
    const cookie = req.headers.get('cookie') || '';
    return { 'Cookie': cookie, 'Content-Type': 'application/json' };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const res = await fetch(`${getMarketingUrl()}/leads/generate-tags`, {
            method: 'POST',
            headers: forwardHeaders(req),
            body: JSON.stringify(body)
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to generate tags', details: e.message }, { status: 500 });
    }
}
