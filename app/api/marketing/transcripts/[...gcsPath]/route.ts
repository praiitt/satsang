import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gcsPath: string[] }> }
) {
  const params = await context.params;
  // Catch-all route - gcsPath is always an array
  const gcsPath = params.gcsPath.join('/'); // Reconstruct the full GCS path

  if (!gcsPath) {
    return NextResponse.json({ error: 'gcsPath is required' }, { status: 400 });
  }

  // Encode the path properly for the URL
  const encodedGcsPath = encodeURIComponent(gcsPath);
  const url = `${AUTH_SERVER_URL}/transcripts/${encodedGcsPath}`;

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
    console.error('[marketing-transcripts] GET error', error);
    return NextResponse.json(
      { error: 'Auth server unavailable' },
      { status: 503 }
    );
  }
}

