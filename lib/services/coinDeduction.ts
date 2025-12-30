import { getFirebaseAuth } from '@/lib/firebase-client';

const COIN_SERVICE_URL =
    process.env.NEXT_PUBLIC_COIN_SERVICE_URL ||
    'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

/**
 * Get auth token for API calls
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;

        if (!user) {
            console.warn('[CoinDeduction] No authenticated user');
            return null;
        }

        return await user.getIdToken();
    } catch (error) {
        console.error('[CoinDeduction] Error getting auth token:', error);
        return null;
    }
}

/**
 * Deduct coins for a Satsang session based on duration
 */
export async function deductSatsangCoins(
    durationMinutes: number,
    metadata?: Record<string, any>
) {
    try {
        const token = await getAuthToken();

        const response = await fetch(`${COIN_SERVICE_URL}/coins/deduct-satsang`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                durationMinutes,
                metadata: metadata || {}
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 402) {
                // Insufficient balance
                return {
                    success: false,
                    hasAccess: false,
                    ...data
                };
            }
            throw new Error(data.error || 'Failed to deduct coins');
        }

        return data;
    } catch (error: any) {
        console.error('Failed to deduct Satsang coins:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Deduct coins for music generation
 */
export async function deductMusicCoins(metadata?: Record<string, any>) {
    try {
        const token = await getAuthToken();

        const response = await fetch(`${COIN_SERVICE_URL}/coins/deduct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                featureId: 'music_generation',
                metadata: metadata || {}
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 402) {
                // Insufficient balance
                return {
                    success: false,
                    hasAccess: false,
                    ...data
                };
            }
            throw new Error(data.error || 'Failed to deduct coins');
        }

        return data;
    } catch (error: any) {
        console.error('Failed to deduct music coins:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
