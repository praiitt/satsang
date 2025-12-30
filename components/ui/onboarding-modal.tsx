'use client';

import { useState } from 'react';
import { userService } from '@/lib/services/userService';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { Button } from '@/components/livekit/button';
import { X, Mail, User, Globe } from 'lucide-react';

export interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const auth = getFirebaseAuth();
            const user = auth.currentUser;

            if (!user) {
                setError('Please login first');
                setLoading(false);
                return;
            }

            await userService.completeOnboarding(
                user.uid,
                email.trim(),
                name.trim(),
                language
            );

            console.log('[Onboarding] Profile completed successfully');
            onComplete();
        } catch (err: any) {
            console.error('[Onboarding] Error:', err);
            setError(err.message || 'Failed to complete profile');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl text-white">
                    <h2 className="text-2xl font-bold mb-2">Welcome to RRAASI! 🙏</h2>
                    <p className="text-amber-50 text-sm">
                        Complete your profile to get started on your spiritual journey
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <User className="inline h-4 w-4 mr-2" />
                            Your Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-amber-500 focus:outline-none dark:bg-gray-800 dark:text-white"
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Mail className="inline h-4 w-4 mr-2" />
                            Email Address *
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-amber-500 focus:outline-none dark:bg-gray-800 dark:text-white"
                            disabled={loading}
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            We'll send receipts and updates here
                        </p>
                    </div>

                    {/* Language Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Globe className="inline h-4 w-4 mr-2" />
                            Preferred Language
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${language === 'en'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                                    }`}
                                disabled={loading}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('hi')}
                                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${language === 'hi'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                                    }`}
                                disabled={loading}
                            >
                                हिंदी
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Complete Profile'}
                    </Button>

                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                </form>
            </div>
        </div>
    );
}

export default OnboardingModal;
