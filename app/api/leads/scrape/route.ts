import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const getMarketingUrl = () => process.env.MARKETING_SERVER_URL || 'http://localhost:4001';
const fwd = (req: NextRequest) => ({ 'Cookie': req.headers.get('cookie') || '', 'Content-Type': 'application/json' });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const res = await fetch(`${getMarketingUrl()}/leads/scrape`, {
        method: 'POST', headers: fwd(req), body: JSON.stringify(body)
    });
    return NextResponse.json(await res.json(), { status: res.status });
}
