import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API routes to the auth server
 * This allows the frontend to call auth endpoints through Next.js API routes
 * which handles CORS and cookies properly
 */

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'POST');
}

async function proxyRequest(request: NextRequest, pathSegments: string[], method: 'GET' | 'POST') {
  const path = pathSegments.join('/');
  const url = `${AUTH_SERVER_URL}/auth/${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Forward cookies from the request
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    // Try to parse JSON, but handle non-JSON responses gracefully
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        console.error('[auth-proxy] Failed to parse JSON response:', text);
        data = { error: 'Invalid response from auth server', details: text };
      }
    } else {
      const text = await response.text();
      data = { error: 'Unexpected response format', details: text };
    }

    // Forward set-cookie headers from auth server
    const setCookieHeader = response.headers.get('set-cookie');
    const nextResponse = NextResponse.json(data, { status: response.status });

    if (setCookieHeader) {
      // Parse cookie header - handle multiple cookies and attributes
      // Note: Multiple cookies in Set-Cookie are separated by commas, but we need to be careful
      // because attribute values might also contain commas. We'll parse each cookie separately.

      // Split by comma, but only if it's not inside quotes or part of an attribute value
      // For simplicity, we'll handle the common case where cookies are on separate lines or properly formatted
      const cookieStrings = setCookieHeader.includes('\n')
        ? setCookieHeader.split('\n').map((c) => c.trim())
        : [setCookieHeader];

      cookieStrings.forEach((cookieString) => {
        if (!cookieString) return;

        // Split by semicolon to get name=value and attributes
        const parts = cookieString.split(';').map((p) => p.trim());
        const [nameValue] = parts;
        if (!nameValue) return;

        const equalIndex = nameValue.indexOf('=');
        if (equalIndex === -1) return;

        const name = nameValue.substring(0, equalIndex).trim();
        const value = nameValue.substring(equalIndex + 1).trim();

        if (!name || !value) return;

        // Parse cookie attributes
        const cookieOptions: {
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: 'strict' | 'lax' | 'none';
          path?: string;
          maxAge?: number;
        } = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        };

        // Extract attributes from cookie parts
        for (const part of parts.slice(1)) {
          const lowerPart = part.toLowerCase();
          if (lowerPart.startsWith('max-age=')) {
            const maxAge = parseInt(part.split('=')[1], 10);
            if (!isNaN(maxAge) && maxAge > 0) {
              cookieOptions.maxAge = maxAge;
            }
          } else if (lowerPart === 'httponly') {
            cookieOptions.httpOnly = true;
          } else if (lowerPart === 'secure') {
            cookieOptions.secure = true;
          } else if (lowerPart.startsWith('samesite=')) {
            const sameSite = part.split('=')[1].toLowerCase();
            if (sameSite === 'strict' || sameSite === 'lax' || sameSite === 'none') {
              cookieOptions.sameSite = sameSite;
            }
          } else if (lowerPart.startsWith('path=')) {
            cookieOptions.path = part.split('=')[1];
          }
        }

        // Default maxAge to 5 days if not specified (matching auth server: 5 days = 432000 seconds)
        if (!cookieOptions.maxAge) {
          cookieOptions.maxAge = 60 * 60 * 24 * 5; // 5 days in seconds
        }

        try {
          nextResponse.cookies.set(name, value, cookieOptions);
          console.log(
            `[auth-proxy] Set cookie: ${name} with maxAge: ${cookieOptions.maxAge} seconds`
          );
        } catch (error) {
          console.error(`[auth-proxy] Failed to set cookie ${name}:`, error);
        }
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('[auth-proxy] Error:', error);
    return NextResponse.json({ error: 'Auth server unavailable' }, { status: 503 });
  }
}
