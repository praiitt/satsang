import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const MKT = () => process.env.MARKETING_SERVER_URL || 'http://127.0.0.1:4001';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const cookie = req.headers.get('cookie') || '';

    const upstream = await fetch(`${MKT()}/facebook-leads/bulk-send-email`, {
        method: 'POST',
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
