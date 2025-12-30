/**
 * Client-side API functions for authentication
 */

// Use Next.js API routes as proxy (better for cookies and CORS)
const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_API_URL ||
  (typeof window === 'undefined'
    ? ((process.env.AUTH_SERVER_URL || 'http://localhost:4000') + '/auth')
    : '/backend/auth');

export interface AuthResponse {
  uid: string;
  phone_number?: string;
  email?: string;
  expiresIn: number;
}

export interface UserInfo {
  uid: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  claims: Record<string, unknown>;
}

/**
 * Exchange Firebase ID token for session cookie
 */
export async function sessionLogin(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${AUTH_SERVER_URL}/sessionLogin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important: include cookies
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    let errorData: { error?: string; details?: string } = {};
    try {
      errorData = (await response.json()) as { error?: string; details?: string };
    } catch {
      const text = await response.text().catch(() => 'Unknown error');
      errorData = { error: 'Failed to create session', details: text };
    }
    const errorMessage = errorData.details
      ? `${errorData.error || 'Failed to create session'}: ${errorData.details}`
      : errorData.error || 'Failed to create session';
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Logout - clear session cookie
 */
export async function sessionLogout(): Promise<void> {
  await fetch(`${AUTH_SERVER_URL}/sessionLogout`, {
    method: 'POST',
    credentials: 'include',
  });
}

/**
 * Get current authenticated user
 * @param reqCookies Optional cookies to pass (useful for server-side calls)
 */
export async function getCurrentUser(reqCookies?: string): Promise<UserInfo> {
  const fetchOptions: RequestInit = {
    method: 'GET',
    credentials: 'include',
  };

  if (typeof window === 'undefined') {
    let cookie = reqCookies;

    // If no cookies passed, try to get from next/headers
    if (!cookie) {
      try {
        // Use dynamic import to avoid issues in client-side bundles
        const { headers } = await import('next/headers');
        const headerList = await headers();
        cookie = headerList.get('cookie') || undefined;
      } catch (e) {
        // Probably not in a context where headers() is available
      }
    }

    if (cookie) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        cookie: cookie,
      };
    }
  }

  const response = await fetch(`${AUTH_SERVER_URL}/me`, fetchOptions);

  if (!response.ok) {
    throw new Error('Not authenticated');
  }

  return response.json();
}

/**
 * Check if phone number is registered
 */
export async function checkPhoneNumber(
  phoneNumber: string
): Promise<{ exists: boolean; uid?: string }> {
  const response = await fetch(`${AUTH_SERVER_URL}/check-phone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!response.ok) {
    throw new Error('Failed to check phone number');
  }

  return response.json();
}
