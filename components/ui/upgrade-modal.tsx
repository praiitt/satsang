'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { Coins, Sparkles, Crown, Zap, X } from 'lucide-react';

export interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    requiredCoins?: number;
    availableCoins?: number;
}

const SUBSCRIPTION_PLANS = [
    {
        id: 'seeker_7',
        name: 'Seeker',
        duration: '7 days',
        price: 99,
        coins: 300,
        icon: Sparkles,
        color: 'from-blue-500 to-cyan-500',
        features: [
            'All basic features + 300 coins',
            '7 days access',
            'Basic guru chats',
            'Daily tarot readings'
        ]
    },
    {
        id: 'devotee_30',
        name: 'Devotee',
        duration: '30 days',
        price: 299,
        coins: 1200,
        icon: Crown,
        color: 'from-purple-500 to-pink-500',
        popular: true,
        features: [
            'Unlimited guru chats',
            '1200 coins included',
            '10 music generations/month',
            'Priority support'
        ]
    },
    {
        id: 'sadhak_90',
        name: 'Sadhak',
        duration: '90 days',
        price: 799,
        coins: 4000,
        icon: Zap,
        color: 'from-orange-500 to-red-500',
        features: [
            'Unlimited all features',
            '4000 coins included',
            '90 days access',
            'Premium support'
        ]
    }
];

export function UpgradeModal({
    isOpen,
    onClose,
    featureName,
    requiredCoins,
    availableCoins
}: UpgradeModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handlePayment = async () => {
        if (!selectedPlan || processing) return;

        setProcessing(true);

        try {
            // Import services dynamically
            const { coinClient } = await import('@/lib/services/coinClient');
            const { initializePayment } = await import('@/lib/services/razorpayClient');
            const { toast } = await import('sonner');
            const { getFirebaseAuth } = await import('@/lib/firebase-client');

            // Check if user is authenticated
            const auth = getFirebaseAuth();
            const user = auth.currentUser;

            if (!user) {
                toast.error('Please login to purchase a subscription');
                setProcessing(false);
                return;
            }

            // Create order
            const orderResult = await coinClient.createSubscriptionOrder(selectedPlan);

            if (!orderResult.success || !orderResult.order) {
                const errorMsg = orderResult.error || 'Failed to create order';
                if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                    toast.error('Please login again to continue');
                } else {
                    toast.error(errorMsg);
                }
                setProcessing(false);
                return;
            }

            const order = orderResult.order;

            // Get user details for prefill
            const userName = user.displayName || '';
            const userEmail = user.email || '';

            // Initialize Razorpay payment
            await initializePayment({
                key: 'rzp_live_RxIBquY93WqdKX', // Your live key
                amount: order.amount,
                currency: order.currency,
                name: 'RRAASI',
                description: order.planName,
                order_id: order.id,
                handler: async (response) => {
                    // Verify payment on backend
                    const verifyResult = await coinClient.verifySubscriptionPayment(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature,
                        selectedPlan
                    );

                    if (verifyResult.success) {
                        toast.success(`🎉 Payment successful! ${verifyResult.coinsAdded} coins added to your account!`);
                        onClose();
                        // Refresh the page to update coin balance
                        window.location.reload();
                    } else {
                        toast.error(verifyResult.error || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: userName,
                    email: userEmail,
                },
                theme: {
                    color: '#f59e0b' // amber-500
                }
            });

        } catch (error: any) {
            console.error('Payment error:', error);
            const { toast } = await import('sonner');
            toast.error(error.message || 'Payment failed');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                            {featureName ? `Unlock ${featureName}` : 'Upgrade Your Plan'}
                        </h2>
                        {featureName && requiredCoins && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                You need <span className="font-semibold text-amber-600">{requiredCoins} coins</span> to use this feature.
                                {availableCoins !== undefined && (
                                    <> You currently have <span className="font-semibold">{availableCoins} coins</span>.</>
                                )}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={processing}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Subscription Plans */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {SUBSCRIPTION_PLANS.map((plan) => {
                            const Icon = plan.icon;
                            const isSelected = selectedPlan === plan.id;

                            return (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`
                    relative p-6 rounded-2xl border-2 cursor-pointer transition-all
                    ${isSelected
                                            ? 'border-amber-500 shadow-lg shadow-amber-500/20 scale-105'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-amber-400'
                                        }
                    ${plan.popular ? 'ring-2 ring-amber-500' : ''}
                  `}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                MOST POPULAR
                                            </span>
                                        </div>
                                    )}

                                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${plan.color} mb-4`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{plan.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        {plan.duration}
                                    </p>

                                    <div className="flex items-baseline mb-4">
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.price}</span>
                                        <span className="text-gray-600 dark:text-gray-400 ml-2 text-sm">
                                            / {plan.duration}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <Coins className="h-5 w-5 text-amber-600" />
                                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                                            {plan.coins} coins
                                        </span>
                                    </div>

                                    <ul className="space-y-2">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm">
                                                <span className="text-green-500 mt-0.5">✓</span>
                                                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                            disabled={processing}
                        >
                            Maybe Later
                        </Button>
                        <Button
                            onClick={handlePayment}
                            disabled={!selectedPlan || processing}
                            variant="primary"
                            className="flex-1"
                        >
                            {processing ? 'Processing...' : selectedPlan ? 'Continue to Payment' : 'Select a Plan'}
                        </Button>
                    </div>
                    {/* Or buy coins directly section */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3">
                            Or buy coins directly (coming soon)
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { coins: 100, price: 49 },
                                { coins: 300, price: 99 },
                                { coins: 500, price: 149 }
                            ].map((pack) => (
                                <button
                                    key={pack.coins}
                                    className="p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-amber-400 transition-colors opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Coins className="h-4 w-4 text-amber-600" />
                                        <span className="font-semibold text-gray-900 dark:text-white">{pack.coins}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">₹{pack.price}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpgradeModal;
