import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ jobId: string; turnIndex: string }> }
) {
  const params = await context.params;
  const { jobId, turnIndex } = params;

  if (!jobId || !turnIndex) {
    return NextResponse.json(
      { error: 'jobId and turnIndex are required' },
      { status: 400 }
    );
  }

  const url = `${AUTH_SERVER_URL}/podcast/${encodeURIComponent(jobId)}/turns/${encodeURIComponent(turnIndex)}`;

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
      method: 'PATCH',
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
    console.error('[marketing-podcast] PATCH proxy error', error);
    return NextResponse.json(
      { error: 'Podcast server unavailable' },
      { status: 503 }
    );
  }
}

