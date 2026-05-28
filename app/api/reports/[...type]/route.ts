import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

const ASTRO_BACKEND = process.env.NEXT_PUBLIC_ASTROLOGY_BACKEND_URL || 'http://127.0.0.1:3002';

async function resolveBackendToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') || '';
  const firebaseToken = authHeader.replace('Bearer ', '').trim();
  if (!firebaseToken) return null;

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(firebaseToken);
    // Backend authMiddleware supports dev_<uid> bypass for simple auth
    return `dev_${decoded.uid}`;
  } catch {
    // If Firebase verify fails (e.g. custom JWT already), return as-is
    return firebaseToken;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string[] }> }
) {
  try {
    const { type } = await params;
    const typeStr = type.join('/');
    const body = await req.json();

    const backendToken = await resolveBackendToken(req);
    if (!backendToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Determine the correct backend endpoint based on the type
    let backendUrl = '';
    if (typeStr.startsWith('pdf/')) {
      // e.g., pdf/mini-horoscope -> /api/pdf/mini-horoscope
      backendUrl = `${ASTRO_BACKEND}/api/${typeStr}`;
    } else {
      // e.g., nakshatra -> /api/reports/nakshatra
      backendUrl = `${ASTRO_BACKEND}/api/reports/${typeStr}`;
    }
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Reports API Proxy] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reach reports service' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const backendToken = await resolveBackendToken(req);
    const response = await fetch(`${ASTRO_BACKEND}/api/reports/pricing`, {
      headers: backendToken ? { Authorization: `Bearer ${backendToken}` } : {},
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch pricing' }, { status: 500 });
  }
}
