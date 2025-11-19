import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const url = `${AUTH_SERVER_URL}/podcast/${encodeURIComponent(jobId)}`;

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

    const nextResponse = NextResponse.json(
      typeof data === 'string' ? { error: 'Unexpected response', details: data } : data,
      { status: response.status }
    );

    return nextResponse;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[marketing-podcast] GET proxy error', error);
    return NextResponse.json(
      { error: 'Podcast server unavailable' },
      { status: 503 }
    );
  }
}


