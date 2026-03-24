import { NextResponse } from 'next/server';

const MARKETING_SERVER_URL = process.env.MARKETING_SERVER_URL || 'http://localhost:4001';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const response = await fetch(`${MARKETING_SERVER_URL}/satsang-plans?limit=${limit}&offset=${offset}`, {
      headers: {
        'Content-Type': 'application/json',
        // Pass through internal token if needed, or rely on session cookie
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
      },
      // Pass cookies from the current request to the marketing server
      // (Next.js 15 App Router handles this via headers)
      //@ts-ignore
      headers: req.headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: 'Failed to fetch from marketing server', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Satsang Plans] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
