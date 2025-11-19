/* eslint-disable prettier/prettier */
import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  const url = new URL(`${AUTH_SERVER_URL}/transcripts/audio-files`);
  
  // Forward query params
  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  try {
    const response = await fetch(url.toString(), {
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

