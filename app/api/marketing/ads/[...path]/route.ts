import { NextRequest, NextResponse } from 'next/server';

const MARKETING_SERVER_URL = process.env.MARKETING_SERVER_URL || 'http://localhost:4001';

async function proxyToMarketing(req: NextRequest, path: string[]) {
    const subPath = path.join('/');
    const targetUrl = new URL(`${MARKETING_SERVER_URL}/ads/${subPath}`);

    // Forward query params
    req.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value);
    });

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Forward cookies for session authentication
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
    }

    let body: string | undefined;
    const method = req.method;
    if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
        body = await req.text();
    }

    try {
        const response = await fetch(targetUrl.toString(), {
            method,
            headers,
            body,
        });

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        return NextResponse.json(
            typeof data === 'string' ? { error: 'Unexpected response', details: data } : data,
            { status: response.status }
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[ads-proxy] Failed to proxy ${targetUrl.toString()}`, msg);
        return NextResponse.json(
            { error: 'Marketing server unavailable', details: msg },
            { status: 503 }
        );
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyToMarketing(req, path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyToMarketing(req, path);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyToMarketing(req, path);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyToMarketing(req, path);
}
