'use client';

import { useState } from 'react';
import { useCoinBalance } from '@/hooks/useCoinBalance';
import { Coins, Plus } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BuyCoinsModal = dynamic(
    () => import('@/components/spiritual-studio/buy-coins-modal'),
    { ssr: false }
);

export function CoinBalanceBadge() {
    const { balance, loading } = useCoinBalance();
    const [showBuy, setShowBuy] = useState(false);

    const isLow = (balance?.totalCoins ?? 999) < 50;
    const total = balance?.totalCoins;

    return (
        <>
            <div className={`
                flex items-center gap-0 rounded-full border transition-all
                ${isLow
                    ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50'
                }
            `}>
                {/* Balance number or loading skeleton */}
                <Link
                    href="/coins"
                    className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-sm font-semibold rounded-l-full
                        ${isLow ? 'text-orange-700 dark:text-orange-400' : 'text-amber-700 dark:text-amber-400'}
                    `}
                    title="View your coins"
                >
                    <Coins className={`h-3.5 w-3.5 flex-shrink-0 ${isLow && !loading ? 'animate-pulse' : ''}`} />
                    {loading ? (
                        <span className="w-6 h-3 bg-amber-200 dark:bg-amber-700 rounded animate-pulse inline-block" />
                    ) : (
                        <span>{total !== undefined ? total.toLocaleString() : '—'}</span>
                    )}
                    {isLow && !loading && total !== undefined && (
                        <span className="text-[10px] opacity-70">Low</span>
                    )}
                </Link>

                {/* Divider */}
                <div className={`w-px h-4 mx-0.5 flex-shrink-0
                    ${isLow ? 'bg-orange-200 dark:bg-orange-700' : 'bg-amber-200 dark:bg-amber-600/40'}`}
                />

                {/* + top up button */}
                <button
                    onClick={() => setShowBuy(true)}
                    title="Top up coins"
                    className={`px-2 py-1.5 rounded-r-full transition-colors flex items-center
                        ${isLow
                            ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-200/60 dark:hover:bg-orange-800/40'
                            : 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800/30'
                        }
                    `}
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
            </div>

            <BuyCoinsModal
                isOpen={showBuy}
                onClose={() => setShowBuy(false)}
                currentBalance={balance?.totalCoins ?? 0}
                onCoinsAdded={(newBal) => {
                    setShowBuy(false);
                }}
            />
        </>
    );
}

export default CoinBalanceBadge;
