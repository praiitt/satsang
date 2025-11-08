import { NextResponse } from 'next/server';

const HEYGEN_API_BASE = 'https://api.heygen.com';

export async function POST(req: Request) {
  try {
    const { session_id, session_token, text, task_type = 'talk' } = await req.json();
    if (!session_id || !session_token || !text) {
      return NextResponse.json(
        { error: 'session_id, session_token and text required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${HEYGEN_API_BASE}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session_token}`,
      },
      body: JSON.stringify({ session_id, text, task_type }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json({ error: 'Failed to send task', details: err }, { status: 500 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (_e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
