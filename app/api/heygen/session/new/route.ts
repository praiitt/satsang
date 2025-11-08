import { NextResponse } from 'next/server';

const HEYGEN_API_BASE = 'https://api.heygen.com';

async function createSessionToken(): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error('HEYGEN_API_KEY not configured');
  }

  const response = await fetch(`${HEYGEN_API_BASE}/v1/streaming.create_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Failed to create session token: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  // Some responses are wrapped under data, others may not be; normalize
  const token = data?.data?.token || data?.token;
  if (!token) {
    throw new Error('No token in create_token response');
  }
  return token as string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      avatar_id,
      avatar_name,
      quality = 'high',
      video_encoding = 'H264',
      voice,
      version = 'v2',
    } = body ?? {};

    const sessionToken = await createSessionToken();

    const payload: Record<string, unknown> = {
      version,
      quality,
      video_encoding,
    };
    if (avatar_id) payload.avatar_id = avatar_id;
    if (avatar_name) payload.avatar_name = avatar_name;
    if (voice) payload.voice = voice;
    // fallback to env avatar id if not provided
    if (!payload.avatar_id && !payload.avatar_name && process.env.HEYGEN_AVATAR_ID) {
      payload.avatar_id = process.env.HEYGEN_AVATAR_ID;
    }

    const response = await fetch(`${HEYGEN_API_BASE}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to create session', details: err },
        { status: 500 }
      );
    }

    const data = await response.json();
    const sessionInfo = data?.data || data;
    return NextResponse.json({ ...sessionInfo, session_token: sessionToken });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
