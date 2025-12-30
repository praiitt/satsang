'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';

export function TarotEarlyAccessView() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (email && !isLoading) {
            setIsLoading(true);
            try {
                const db = getFirebaseFirestore();
                await addDoc(collection(db, 'early_access_requests'), {
                    email,
                    service: 'tarot',
                    createdAt: serverTimestamp(),
                    status: 'pending',
                });
                console.log('Tarot early access sign up:', email);
                setIsSubmitted(true);
            } catch (error) {
                console.error('Error saving email:', error);
                alert('Failed to sign up. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-amber-50">
            {/* Background Ornaments */}
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-purple-500 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-500 blur-3xl" />
            </div>

            {/* Mystical Stars */}
            <div className="absolute inset-0 z-0">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute h-1 w-1 rounded-full bg-amber-200 animate-pulse"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">

                {/* Header Icon */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-[0_0_40px_rgba(168,85,247,0.6)]"
                >
                    <span className="text-5xl">🔮</span>
                </motion.div>

                {/* Coming Soon Badge */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/50 bg-purple-900/30 px-4 py-1 text-sm font-semibold text-purple-200"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500"></span>
                    </span>
                    Join the Waiting List
                </motion.div>

                {/* Main Title */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6 bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl font-serif"
                >
                    Mystical Tarot Readings
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-indigo-200 md:text-2xl"
                >
                    Unveil the mysteries of your path through the ancient art of Tarot.
                    Get personalized readings for Love, Career, and Life decisions with AI-powered insights.
                </motion.p>

                {/* Offer Box */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-12 w-full max-w-md rounded-2xl border border-purple-500/30 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-sm sm:p-8"
                >
                    {!isSubmitted ? (
                        <>
                            <div className="mb-6">
                                <h3 className="mb-2 text-xl font-bold text-purple-200">
                                    🎁 Early Access Offer
                                </h3>
                                <p className="text-indigo-200">
                                    Sign up now to get early access and a <span className="font-bold text-amber-300">FREE 3-Card Reading</span> when we launch.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full rounded-lg border border-purple-500/30 bg-slate-800 px-4 py-3 text-lg text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-lg font-bold text-white shadow-lg transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Signing Up...' : 'Join & Claim Free Reading'}
                                </button>
                            </form>
                            <p className="mt-4 text-xs text-slate-400">
                                The cards never lie. Your secrets are safe with us.
                            </p>
                        </>
                    ) : (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-6"
                        >
                            <div className="mb-4 text-6xl">✨</div>
                            <h3 className="mb-2 text-2xl font-bold text-purple-200">
                                The Cards Have Aligned!
                            </h3>
                            <p className="text-indigo-200">
                                Thank you for joining. Your free 3-card reading is reserved. We'll notify you when the mystical journey begins!
                            </p>
                        </motion.div>
                    )}
                </motion.div>

                {/* Back Link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <Link href="/" className="group inline-flex items-center gap-2 text-purple-300 hover:text-purple-200">
                        <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
