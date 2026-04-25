import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const MKT = () => process.env.MARKETING_SERVER_URL || 'http://127.0.0.1:4001';

// SSE streaming proxy — pipes the event stream from marketing-server to client
async function streamProxy(req: NextRequest, endpoint: string) {
    const body = await req.json();
    const cookie = req.headers.get('cookie') || '';

    const upstream = await fetch(`${MKT()}${endpoint}`, {
        method: 'POST',
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    // Pipe the upstream SSE stream directly to the client
    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}

export async function POST(req: NextRequest) {
    return streamProxy(req, '/facebook-leads/bulk-send-whatsapp');
}
