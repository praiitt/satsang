'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { coinClient, CoinBalance } from '@/lib/services/coinClient';

export interface UseCoinBalanceReturn {
    balance: CoinBalance | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * React hook to manage user's coin balance
 */
export function useCoinBalance(): UseCoinBalanceReturn {
    const { user, isAuthenticated } = useAuth();
    const [balance, setBalance] = useState<CoinBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setBalance(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await coinClient.getBalance();

            if (result.success && result.balance) {
                setBalance(result.balance);
            } else {
                setError(result.error || 'Failed to fetch balance');
            }
        } catch (err: any) {
            console.error('[useCoinBalance] Error:', err);
            setError(err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return {
        balance,
        loading,
        error,
        refresh: fetchBalance
    };
}

export default useCoinBalance;
