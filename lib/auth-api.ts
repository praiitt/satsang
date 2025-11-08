/**
 * Client-side API functions for authentication
 */

// Use Next.js API routes as proxy (better for cookies and CORS)
const AUTH_SERVER_URL = '/api/auth';

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
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const response = await fetch(`${AUTH_SERVER_URL}/me`, {
    method: 'GET',
    credentials: 'include',
  });

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
