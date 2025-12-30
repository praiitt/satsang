'use client';

import { useCoinBalance } from '@/hooks/useCoinBalance';
import { Coins } from 'lucide-react';
import Link from 'next/link';

/**
 * Coin Balance Badge
 * Displays user's current coin balance in the header
 */
export function CoinBalanceBadge() {
    const { balance, loading, error } = useCoinBalance();

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse">
                <Coins className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">...</span>
            </div>
        );
    }

    if (error || !balance) {
        return null;
    }

    const isLowBalance = balance.totalCoins < 50;

    return (
        <Link
            href="/coins"
            className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        transition-all duration-200 hover:scale-105
        ${isLowBalance
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }
      `}
        >
            <Coins className={`h-4 w-4 ${isLowBalance ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-semibold">
                {balance.totalCoins.toLocaleString()}
            </span>
            {isLowBalance && (
                <span className="text-xs opacity-75">Low</span>
            )}
        </Link>
    );
}

export default CoinBalanceBadge;
