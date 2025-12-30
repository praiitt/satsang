import { useMemo, useState } from 'react';
import { useCoinBalance } from './useCoinBalance';
import { SERVICE_COSTS, calculateSatsangCost, getMusicCost } from '@/lib/service-costs';

export function useServiceCost(service: 'satsang' | 'music', estimatedMinutes?: number) {
    const { balance, loading } = useCoinBalance();
    const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);

    const cost = useMemo(() => {
        if (service === 'satsang') {
            // If estimatedMinutes provided, calculate cost, otherwise return per-minute rate
            return estimatedMinutes
                ? calculateSatsangCost(estimatedMinutes)
                : SERVICE_COSTS.SATSANG_PER_MINUTE;
        }
        return getMusicCost();
    }, [service, estimatedMinutes]);

    const balanceValue = typeof balance === 'number' ? balance : 0;
    const canAfford = balanceValue >= cost;
    const hasInsufficientBalance = !loading && !canAfford;

    const costDisplay = useMemo(() => {
        if (service === 'satsang') {
            return `${SERVICE_COSTS.SATSANG_PER_MINUTE} coins/min`;
        }
        return `${cost} coins`;
    }, [service, cost]);

    return {
        cost,
        perMinuteRate: service === 'satsang' ? SERVICE_COSTS.SATSANG_PER_MINUTE : null,
        balance: balanceValue,
        canAfford,
        hasInsufficientBalance,
        costDisplay,
        loading,
        showInsufficientBalanceModal,
        setShowInsufficientBalanceModal,
    };
}
