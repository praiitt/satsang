import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const url = `${AUTH_SERVER_URL}/video-stitch`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    const nextResponse = NextResponse.json(
      typeof data === 'string' ? { error: 'Unexpected response', details: data } : data,
      { status: response.status }
    );

    return nextResponse;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[video-stitch] POST proxy error', error);
    return NextResponse.json(
      { error: 'Video stitching server unavailable' },
      { status: 503 }
    );
  }
}

