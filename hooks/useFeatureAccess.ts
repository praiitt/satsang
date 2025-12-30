'use client';

import { useState, useCallback } from 'react';
import { coinClient, FeatureAccess } from '@/lib/services/coinClient';

export interface UseFeatureAccessReturn {
    checkAccess: (featureId: string) => Promise<FeatureAccess | null>;
    deductCoins: (featureId: string, metadata?: any) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

/**
 * React hook for checking feature access and deducting coins
 */
export function useFeatureAccess(): UseFeatureAccessReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkAccess = useCallback(async (featureId: string): Promise<FeatureAccess | null> => {
        try {
            setLoading(true);
            setError(null);

            const result = await coinClient.checkAccess(featureId);

            if (result.success && result.access) {
                return result.access;
            } else {
                setError(result.error || 'Failed to check access');
                return null;
            }
        } catch (err: any) {
            console.error('[useFeatureAccess] Check error:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const deductCoins = useCallback(async (featureId: string, metadata: any = {}): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);

            const result = await coinClient.deductCoins(featureId, metadata);

            if (result.success) {
                return true;
            } else {
                setError(result.error || 'Failed to deduct coins');
                return false;
            }
        } catch (err: any) {
            console.error('[useFeatureAccess] Deduct error:', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        checkAccess,
        deductCoins,
        loading,
        error
    };
}

export default useFeatureAccess;
