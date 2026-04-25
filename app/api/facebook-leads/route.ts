import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MKT = () => process.env.MARKETING_SERVER_URL || 'http://127.0.0.1:4001';
const fwd = (req: NextRequest) => ({ 'Cookie': req.headers.get('cookie') || '' });

async function proxy(res: Response) {
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    }
    const text = await res.text();
    return NextResponse.json({ error: 'Backend error', details: text }, { status: res.status });
}

export async function GET(req: NextRequest) {
    try {
        const res = await fetch(`${MKT()}/facebook-leads`, { headers: fwd(req), cache: 'no-store' });
        return proxy(res);
    } catch (e: any) {
        return NextResponse.json({ error: 'Proxy failed', details: e.message }, { status: 502 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const cookie = req.headers.get('cookie') || '';
        const res = await fetch(`${MKT()}/facebook-leads`, {
            method: 'POST',
            headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return proxy(res);
    } catch (e: any) {
        return NextResponse.json({ error: 'Proxy failed', details: e.message }, { status: 502 });
    }
}
