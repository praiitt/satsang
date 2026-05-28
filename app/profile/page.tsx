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
    CheckCircle2,
    Music,
    Sparkles,
    MapPin,
    Clock
} from 'lucide-react';
import { Button } from '@/components/livekit/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { RecordingsModal } from '@/components/app/recordings-modal';
import { EnergyPassportCard } from '@/components/app/energy-passport-card';
import { BiorhythmRings } from '@/components/app/biorhythm-rings';
import { DailyCosmicInsight } from '@/components/app/daily-cosmic-insight';
import { coinClient } from '@/lib/services/coinClient';

export default function ProfilePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { profile, loading: profileLoading } = useUserProfile();
    const { balance, loading: balanceLoading } = useCoinBalance();
    const [user, setUser] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [showRecordings, setShowRecordings] = useState(false);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    
    // Daily Insights State
    const [biorhythmData, setBiorhythmData] = useState<any>(null);
    const [nakshatraData, setNakshatraData] = useState<any>(null);
    const [panchangData, setPanchangData] = useState<any>(null);
    const [dailyInsightsLoading, setDailyInsightsLoading] = useState(false);

    useEffect(() => {
        const loadTransactions = async () => {
            setLoadingTransactions(true);
            const result = await coinClient.getTransactions(5); // latest 5
            if (result.success && result.transactions) {
                setRecentTransactions(result.transactions);
            }
            setLoadingTransactions(false);
        };
        
        if (user) {
            loadTransactions();
        }
    }, [user]);

    // Fetch daily insights
    useEffect(() => {
        const fetchDailyInsights = async () => {
            if (!profile || !(profile as any).birthData || !user?.uid) return;
            
            setDailyInsightsLoading(true);
            try {
                const payloadBirthData = {
                    ...(profile as any).birthData,
                    name: (profile as any).birthData.name || (profile as any).name || user.displayName || 'User'
                };
                
                const res = await fetch('/api/astrology/daily-insights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        birthData: payloadBirthData
                    })
                });
                
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        setBiorhythmData(json.data.biorhythm);
                        setNakshatraData(json.data.nakshatraPrediction);
                        setPanchangData(json.data.panchang);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch daily insights:', error);
            } finally {
                setDailyInsightsLoading(false);
            }
        };

        if (user && profile && (profile as any).birthData) {
            fetchDailyInsights();
        }
    }, [user, profile]);

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
                {/* Energy Passport Header */}
                <EnergyPassportCard userProfile={profile as any} />

                {/* Daily Cosmic Insights Row */}
                {(profile as any).birthData && (
                    <div className="grid md:grid-cols-[1fr_2fr] gap-6 mb-6">
                        <BiorhythmRings data={biorhythmData} loading={dailyInsightsLoading} />
                        <DailyCosmicInsight nakshatraData={nakshatraData} panchangData={panchangData} loading={dailyInsightsLoading} />
                    </div>
                )}

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

                {/* Session Recordings Quick Access */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Music className="h-5 w-5 text-amber-600" />
                            My Session Recordings
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                            Listen to your past Satsang and music creation sessions.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setShowRecordings(true)}
                        variant="primary"
                        className="w-full sm:w-auto shrink-0"
                    >
                        View Recordings
                    </Button>
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

                {/* Vedic Astrology Status */}
                {(profile as any).birthData && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            Vedic Astrology Profile
                        </h2>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Astrology Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`h-2.5 w-2.5 rounded-full ${(profile as any).chartsGenerated ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {(profile as any).chartsGenerated ? 'Charts Activated & Ready' : 'Generating Charts...'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => router.push('/vedic-jyotish')}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md w-full md:w-auto"
                                >
                                    Access Jyotish AI
                                </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-indigo-100 dark:border-indigo-800/50 pt-4">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Calendar className="h-3 w-3"/> Date of Birth</p>
                                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                                        {(profile as any).birthData.birthDate}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3"/> Time of Birth</p>
                                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                                        {(profile as any).birthData.birthTime}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3"/> Place of Birth</p>
                                    <p className="font-semibold text-gray-900 dark:text-white mt-1 line-clamp-1">
                                        {(profile as any).birthData.placeOfBirth || `${(profile as any).birthData.latitude.toFixed(2)}, ${(profile as any).birthData.longitude.toFixed(2)}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
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

                {/* Recent Coin Transactions */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Coins className="h-5 w-5 text-amber-600" />
                            Recent Coin Transactions
                        </h2>
                        <Button variant="secondary" size="sm" onClick={() => router.push('/coins')}>
                            View All
                        </Button>
                    </div>
                    
                    {loadingTransactions ? (
                        <div className="text-center py-4 text-gray-500">Loading transactions...</div>
                    ) : recentTransactions.length > 0 ? (
                        <div className="space-y-3">
                            {recentTransactions.map((txn) => {
                                let dateObj = new Date();
                                if (txn.timestamp) {
                                    if (txn.timestamp._seconds) {
                                        dateObj = new Date(txn.timestamp._seconds * 1000);
                                    } else {
                                        dateObj = new Date(txn.timestamp);
                                    }
                                }
                                
                                return (
                                    <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                {txn.description}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className={`text-sm font-bold ${txn.type === 'spend' ? 'text-red-600' : 'text-green-600'}`}>
                                            {txn.type === 'spend' ? '-' : '+'}{txn.amount}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            No recent coin transactions.
                        </div>
                    )}
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

            <RecordingsModal
                isOpen={showRecordings}
                onClose={() => setShowRecordings(false)}
            />
        </div>
    );
}
