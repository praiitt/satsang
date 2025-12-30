'use client';

import { Button } from '@/components/livekit/button';
import { Coins, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InsufficientBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    required: number;
    available: number;
    service: string;
}

export function InsufficientBalanceModal({
    isOpen,
    onClose,
    required,
    available,
    service,
}: InsufficientBalanceModalProps) {
    const router = useRouter();

    const handleGetCoins = () => {
        router.push('/coins');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Insufficient Coins</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You don't have enough coins to use {service}
                        </p>
                    </div>
                </div>

                {/* Balance Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Required:</span>
                        <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <Coins className="h-4 w-4" />
                            <span>{required}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Your balance:</span>
                        <div className="flex items-center gap-1 font-semibold">
                            <Coins className="h-4 w-4" />
                            <span>{available}</span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Need:</span>
                            <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                <Coins className="h-4 w-4" />
                                <span>{required - available} more</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-2">
                    <Button
                        onClick={handleGetCoins}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    >
                        <Coins className="h-5 w-5 mr-2" />
                        Get More Coins
                    </Button>
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        className="w-full"
                    >
                        Maybe Later
                    </Button>
                </div>
            </div>
        </div>
    );
}
