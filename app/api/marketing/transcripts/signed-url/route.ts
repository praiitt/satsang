import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gcsPath = searchParams.get('gcsPath');

  if (!gcsPath) {
    return NextResponse.json({ error: 'gcsPath query parameter is required' }, { status: 400 });
  }

  const url = `${AUTH_SERVER_URL}/transcripts/signed-url?gcsPath=${encodeURIComponent(gcsPath)}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return NextResponse.json(
      typeof data === 'string' ? { error: 'Unexpected response', details: data } : data,
      { status: response.status }
    );
  } catch (error) {
    console.error('[marketing-transcripts] GET signed-url error', error);
    return NextResponse.json(
      { error: 'Auth server unavailable' },
      { status: 503 }
    );
  }
}

