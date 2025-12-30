'use client';

import { useState } from 'react';
import { useCoinBalance } from '@/hooks/useCoinBalance';
import { coinClient } from '@/lib/services/coinClient';
import { Button } from '@/components/livekit/button';
import { Coins, History, Sparkles, TrendingUp, Package } from 'lucide-react';
import { UpgradeModal } from '@/components/ui/upgrade-modal';

export default function CoinsPage() {
    const { balance, loading, refresh } = useCoinBalance();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [features, setFeatures] = useState<any>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [loadingFeatures, setLoadingFeatures] = useState(false);

    const loadTransactions = async () => {
        setLoadingTransactions(true);
        const result = await coinClient.getTransactions(20);
        if (result.success && result.transactions) {
            setTransactions(result.transactions);
        }
        setLoadingTransactions(false);
    };

    const loadFeatures = async () => {
        setLoadingFeatures(true);
        const result = await coinClient.getAllFeatures();
        if (result.success && result.features) {
            setFeatures(result.features);
        }
        setLoadingFeatures(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        RRAASI Coins
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your coins and access premium spiritual features
                    </p>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm font-medium mb-2">Your Balance</p>
                            {loading ? (
                                <div className="h-12 w-32 bg-white/20 rounded animate-pulse"></div>
                            ) : (
                                <div className="flex items-baseline gap-2">
                                    <Coins className="h-8 w-8" />
                                    <span className="text-5xl font-bold">
                                        {balance?.totalCoins.toLocaleString() || 0}
                                    </span>
                                    <span className="text-xl text-amber-100">coins</span>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => setShowUpgradeModal(true)}
                            className="bg-white text-amber-600 hover:bg-amber-50"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Get More Coins
                        </Button>
                    </div>

                    {/* Balance Breakdown */}
                    {balance && (
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                            <div>
                                <p className="text-amber-100 text-xs mb-1">Earned</p>
                                <p className="text-xl font-semibold">{balance.earnedCoins.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-amber-100 text-xs mb-1">Spent</p>
                                <p className="text-xl font-semibold">{balance.spentCoins.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-amber-100 text-xs mb-1">Bonus</p>
                                <p className="text-xl font-semibold">{balance.bonusCoins.toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={loadTransactions}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-amber-400 transition-all text-left"
                    >
                        <History className="h-6 w-6 text-amber-600 mb-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Transaction History
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            View your coin usage and earnings
                        </p>
                    </button>

                    <button
                        onClick={loadFeatures}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-amber-400 transition-all text-left"
                    >
                        <Package className="h-6 w-6 text-amber-600 mb-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Feature Pricing
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            See how coins are used for each feature
                        </p>
                    </button>
                </div>

                {/* Transactions */}
                {transactions.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Recent Transactions
                        </h2>
                        <div className="space-y-3">
                            {transactions.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {txn.description}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(txn.timestamp).toLocaleDateString()} at{' '}
                                            {new Date(txn.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div
                                        className={`text-lg font-semibold ${txn.type === 'spend'
                                                ? 'text-red-600'
                                                : 'text-green-600'
                                            }`}
                                    >
                                        {txn.type === 'spend' ? '-' : '+'}
                                        {txn.amount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Features */}
                {features && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Feature Pricing
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(features).map(([id, feature]: [string, any]) => (
                                <div
                                    key={id}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {feature.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                            {feature.category}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {feature.cost === 0 ? (
                                            <span className="text-green-600 font-semibold">FREE</span>
                                        ) : (
                                            <>
                                                <Coins className="h-4 w-4 text-amber-600" />
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {feature.cost}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty States */}
                {transactions.length === 0 && !loadingTransactions && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        No transactions yet. Start using RRAASI features to see your history!
                    </div>
                )}
            </div>

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
            />
        </div>
    );
}
