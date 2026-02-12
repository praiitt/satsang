/**
 * Client-side API functions for authentication
 */

// Use Next.js API routes as proxy (better for cookies and CORS)
// Use direct Cloud Function URL in production to avoid rewrite issues
const PROD_API_URL = 'https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-auth-server';

// Base API URL (e.g. http://localhost:4000 or Cloud Function Root)
const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL ||
  (typeof window === 'undefined'
    ? (process.env.AUTH_SERVER_URL || 'http://localhost:4000')
    : PROD_API_URL);

// Specific Endpoint Roots
const AUTH_URL = `${API_BASE_URL}/auth`;
const CHAT_URL = `${API_BASE_URL}/chat`;

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
  const response = await fetch(`${AUTH_URL}/sessionLogin`, {
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
  await fetch(`${AUTH_URL}/sessionLogout`, {
    method: 'POST',
    credentials: 'include',
  });
}

/**
 * Get current authenticated user
 * @param reqCookies Optional cookies to pass (useful for server-side calls)
 */
export async function getCurrentUser(reqCookies?: string): Promise<UserInfo | null> {
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

  const response = await fetch(`${AUTH_URL}/me`, fetchOptions);

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

/**
 * Check if phone number is registered
 */
export async function checkPhoneNumber(
  phoneNumber: string
): Promise<{ exists: boolean; uid?: string }> {
  const response = await fetch(`${AUTH_URL}/check-phone`, {
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

/**
 * Trigger Marketing Welcome (Eco-Culture)
 */
export async function triggerMarketingWelcome(data: {
  userId: string;
  phone?: string;
  email?: string;
  serviceOfInterest: string;
  name?: string;
  zodiacSign?: string;
}): Promise<void> {
  // Fire and forget - don't block UI
  fetch(`${API_BASE_URL}/marketing/welcome`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).catch((err) => console.error('Marketing Trigger Failed:', err));
}

export interface ChatMessage {
  id: string;
  userId: string;
  agentId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
}

export interface Recording {
  id: string;
  userId: string;
  status: string;
  publicUrl?: string;
  duration?: number;
  createdAt?: { _seconds: number; _nanoseconds: number } | string;
  timestamp?: string; // Sometimes flattened
  intention?: string; // Context for resuming session
}

/**
 * Fetch chat history
 */
export async function getChatHistory(userId: string, agentId?: string): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ userId, limit: '50' });
  if (agentId) params.append('agentId', agentId);

  const response = await fetch(`${CHAT_URL}/history?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.messages || [];
}

/**
 * Fetch user recordings
 */
export async function getUserRecordings(userId: string): Promise<Recording[]> {
  const params = new URLSearchParams({ userId, limit: '20' });

  const response = await fetch(`${CHAT_URL}/recordings?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.recordings || [];
}

