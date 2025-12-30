'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCoinBalance } from '@/hooks/useCoinBalance';
import { useLanguage } from '@/contexts/language-context';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Coins,
    Crown,
    Gift,
    TrendingUp,
    Copy,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/livekit/button';
import { LogoutButton } from '@/components/auth/logout-button';

export default function ProfilePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { profile, loading: profileLoading } = useUserProfile();
    const { balance, loading: balanceLoading } = useCoinBalance();
    const [user, setUser] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;

        if (!currentUser && !profileLoading) {
            router.push('/login');
        } else {
            setUser(currentUser);
        }
    }, [profileLoading, router]);

    const copyReferralCode = () => {
        if (profile?.referralCode) {
            navigator.clipboard.writeText(profile.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (date: Date | undefined) => {
        if (!date) return t('profile.notProvided');
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (profileLoading || balanceLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">{t('profile.loading')}</p>
                </div>
            </div>
        );
    }

    if (!profile || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">{t('profile.loginRequired')}</p>
                    <Button
                        onClick={() => router.push('/login')}
                        className="mt-4"
                    >
                        {t('profile.goToLogin')}
                    </Button>
                </div>
            </div>
        );
    }

    const isSubscriptionActive = profile.hasActiveSubscription &&
        profile.subscriptionEndDate &&
        new Date(profile.subscriptionEndDate) > new Date();

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
                    <div className="flex items-center gap-6">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-4xl font-bold">
                            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {profile.name || 'User'}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('profile.memberSince')} {formatDate(profile.createdAt)}
                            </p>
                        </div>
                        {isSubscriptionActive && (
                            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-full flex items-center gap-2">
                                <Crown className="h-5 w-5" />
                                <span className="font-semibold">{t('profile.premium')}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Contact Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-amber-600" />
                            {t('profile.contactInfo')}
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.email')}</p>
                                    <p className="text-gray-900 dark:text-white">{profile.email || t('profile.notProvided')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.phone')}</p>
                                    <p className="text-gray-900 dark:text-white">{profile.phone || user.phoneNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.lastLogin')}</p>
                                    <p className="text-gray-900 dark:text-white">{formatDate(profile.lastLoginAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coin Balance */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Coins className="h-5 w-5" />
                            {t('profile.coinBalance')}
                        </h2>
                        <div className="text-center py-4">
                            <div className="text-6xl font-bold mb-2">{balance?.totalCoins || 0}</div>
                            <p className="text-amber-100">{t('profile.rraasCoins')}</p>
                        </div>
                        <Button
                            onClick={() => router.push('/coins')}
                            variant="secondary"
                            className="w-full mt-4 bg-white text-amber-600 hover:bg-amber-50"
                        >
                            {t('profile.viewCoinDetails')}
                        </Button>
                    </div>
                </div>

                {/* Subscription Status */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        {t('profile.subscriptionStatus')}
                    </h2>
                    {isSubscriptionActive ? (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.currentPlan')}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {profile.currentPlan?.replace('_', ' ').toUpperCase() || t('profile.premium')}
                                    </p>
                                </div>
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">{t('profile.status')}</p>
                                    <p className="font-semibold text-green-600">{t('profile.active')}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">{t('profile.expiresOn')}</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatDate(profile.subscriptionEndDate)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('profile.noSubscription')}</p>
                            <Button
                                onClick={() => router.push('/coins')}
                                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                            >
                                {t('profile.upgradeNow')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Referral Code */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Gift className="h-5 w-5 text-amber-600" />
                        {t('profile.referralCode')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {t('profile.referralDesc')}
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-2xl font-bold text-center text-gray-900 dark:text-white">
                            {profile.referralCode}
                        </div>
                        <Button
                            onClick={copyReferralCode}
                            variant="secondary"
                            className="h-full px-6"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 mr-2" />
                                    {t('profile.copied')}
                                </>
                            ) : (
                                <>
                                    <Copy className="h-5 w-5 mr-2" />
                                    {t('profile.copy')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Account Statistics */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                        {t('profile.accountStats')}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-amber-600">{profile.totalSessions || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('profile.sessions')}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-green-600">₹{profile.totalSpent || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('profile.totalSpent')}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-blue-600">{balance?.totalCoins ?? profile.totalCoins ?? 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('profile.totalCoins')}</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-3xl font-bold text-purple-600">₹{profile.lifetimeValue || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('profile.lifetimeValue')}</p>
                        </div>
                    </div>
                </div>

                {/* Logout Section - Less Prominent */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mt-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Actions</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sign out of your account</p>
                        </div>
                        <LogoutButton variant="secondary" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
