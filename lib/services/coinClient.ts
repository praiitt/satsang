import { getFirebaseAuth } from '@/lib/firebase-client';

/**
 * Coin Service Client
 * Client library to interact with rraasi-coin-service cloud function
 */

const COIN_SERVICE_URL =
    process.env.NEXT_PUBLIC_COIN_SERVICE_URL ||
    'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

export interface CoinBalance {
    totalCoins: number;
    earnedCoins: number;
    spentCoins: number;
    bonusCoins: number;
    lastUpdated: Date;
    createdAt: Date;
}

export interface FeatureAccess {
    hasAccess: boolean;
    reason: 'free_tier' | 'subscription_unlimited' | 'sufficient_coins' | 'insufficient_coins';
    cost: number;
    availableCoins?: number;
    requiredCoins?: number;
}

export interface Transaction {
    id: string;
    transactionId: string;
    userId: string;
    type: 'spend' | 'earn' | 'bonus' | 'free_usage';
    amount: number;
    featureId: string | null;
    featureName: string | null;
    description: string;
    timestamp: Date;
    metadata: any;
}

export interface FeatureCost {
    cost: number;
    name: string;
    category: string;
    freeTierAvailable: boolean;
    subscriptionUnlimited: boolean;
}

class CoinClient {
    private async getAuthToken(): Promise<string | null> {
        try {
            const auth = getFirebaseAuth();
            const user = auth.currentUser;
            console.log('[CoinClient] Current user:', user?.uid, user?.email);

            if (!user) {
                console.warn('[CoinClient] No authenticated user found');
                return null;
            }

            const token = await user.getIdToken();
            console.log('[CoinClient] Got auth token, length:', token?.length);
            return token;
        } catch (error) {
            console.error('[CoinClient] Error getting auth token:', error);
            return null;
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<{ success: boolean; data?: T; error?: string }> {
        try {
            const token = await this.getAuthToken();

            const response = await fetch(`${COIN_SERVICE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            return {
                success: true,
                data
            };
        } catch (error: any) {
            console.error('[CoinClient] Request error:', error);
            return {
                success: false,
                error: error.message || 'Network error'
            };
        }
    }

    /**
     * Get user's coin balance
     */
    async getBalance(): Promise<{ success: boolean; balance?: CoinBalance; error?: string }> {
        const result = await this.request<{ balance: CoinBalance }>('/coins/balance');

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            balance: result.data.balance
        };
    }

    /**
     * Check if user can access a feature
     */
    async checkAccess(featureId: string): Promise<{ success: boolean; access?: FeatureAccess; error?: string }> {
        const result = await this.request<FeatureAccess>('/coins/check-access', {
            method: 'POST',
            body: JSON.stringify({ featureId }),
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            access: result.data
        };
    }

    /**
     * Deduct coins for feature usage
     */
    async deductCoins(
        featureId: string,
        metadata: any = {}
    ): Promise<{ success: boolean; coinsDeducted?: number; newBalance?: number; reason?: string; error?: string }> {
        const result = await this.request<{
            coinsDeducted: number;
            newBalance: number;
            reason?: string;
        }>('/coins/deduct', {
            method: 'POST',
            body: JSON.stringify({ featureId, metadata }),
        });

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            ...result.data
        };
    }

    /**
     * Get transaction history
     */
    async getTransactions(limit: number = 50): Promise<{ success: boolean; transactions?: Transaction[]; error?: string }> {
        const result = await this.request<{ transactions: Transaction[] }>(`/coins/transactions?limit=${limit}`);

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            transactions: result.data.transactions
        };
    }

    /**
     * Get all feature costs (public endpoint)
     */
    async getAllFeatures(): Promise<{ success: boolean; features?: Record<string, FeatureCost>; error?: string }> {
        const result = await this.request<{ features: Record<string, FeatureCost> }>('/coins/features');

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            features: result.data.features
        };
    }

    /**
     * Get specific feature cost (public endpoint)
     */
    async getFeature(featureId: string): Promise<{ success: boolean; feature?: FeatureCost; error?: string }> {
        const result = await this.request<{ feature: FeatureCost }>(`/coins/features/${featureId}`);

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            feature: result.data.feature
        };
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{ success: boolean; status?: string; error?: string }> {
        try {
            const response = await fetch(`${COIN_SERVICE_URL}/health`);
            const data = await response.json();

            return {
                success: response.ok,
                status: data.status
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create Razorpay order for subscription
     */
    async createSubscriptionOrder(planId: string): Promise<{
        success: boolean;
        order?: any;
        error?: string
    }> {
        const result = await this.request<{ order: any }>('/subscriptions/create-order', {
            method: 'POST',
            body: JSON.stringify({ planId }),
        });

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            order: result.data.order
        };
    }

    /**
     * Verify subscription payment
     */
    async verifySubscriptionPayment(
        orderId: string,
        paymentId: string,
        signature: string,
        planId: string
    ): Promise<{
        success: boolean;
        subscription?: any;
        coinsAdded?: number;
        error?: string
    }> {
        const result = await this.request<{
            subscription: any;
            coinsAdded: number;
        }>('/subscriptions/verify', {
            method: 'POST',
            body: JSON.stringify({ orderId, paymentId, signature, planId }),
        });

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            ...result.data
        };
    }

    /**
     * Get subscription plans
     */
    async getSubscriptionPlans(): Promise<{
        success: boolean;
        plans?: any[];
        error?: string
    }> {
        const result = await this.request<{ plans: any[] }>('/subscriptions/plans');

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            plans: result.data.plans
        };
    }
}

// Export singleton instance
export const coinClient = new CoinClient();
export default coinClient;
