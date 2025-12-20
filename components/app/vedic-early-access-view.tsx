'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';

export function VedicEarlyAccessView() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            // Here we would send to backend, for now just simulate
            console.log('Early access sign up:', email);
            setIsSubmitted(true);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 text-slate-800 dark:from-slate-950 dark:to-orange-950 dark:text-orange-50">
            {/* Background Ornaments */}
            <div className="absolute inset-0 z-0 opacity-10">
                <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-orange-500 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-yellow-500 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">

                {/* Header Icon */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600 shadow-xl"
                >
                    <span className="text-5xl">🕉️</span>
                </motion.div>

                {/* Coming Soon Badge */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
                    </span>
                    Join the Waiting List
                </motion.div>

                {/* Main Title */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl dark:from-orange-300 dark:to-amber-300"
                >
                    Vedic Jyotish & Matches
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-slate-600 md:text-2xl dark:text-orange-100/80"
                >
                    Experience the ancient wisdom of Vedic Astrology powered by AI.
                    Get precise Kundli analysis, Matchmaking (36 Guna), and personalized remedies.
                </motion.p>

                {/* Offer Box */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-12 w-full max-w-md rounded-2xl border border-orange-200 bg-white/50 p-6 shadow-xl backdrop-blur-sm sm:p-8 dark:border-orange-800 dark:bg-black/30"
                >
                    {!isSubmitted ? (
                        <>
                            <div className="mb-6">
                                <h3 className="mb-2 text-xl font-bold text-orange-800 dark:text-orange-200">
                                    🎁 Early Access Offer
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Sign up now to get early access and a <span className="font-bold text-orange-600 dark:text-orange-400">FREE Comprehensive Horoscope Report</span> when we launch.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-orange-200 bg-white px-4 py-3 text-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-800 dark:bg-slate-900 dark:focus:ring-orange-900"
                                />
                                <button
                                    type="submit"
                                    className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Access & Claim Free Gift
                                </button>
                            </form>
                            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                                We respect your privacy. No spam, just stars.
                            </p>
                        </>
                    ) : (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-6"
                        >
                            <div className="mb-4 text-6xl">✨</div>
                            <h3 className="mb-2 text-2xl font-bold text-orange-800 dark:text-orange-200">
                                You're on the list!
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300">
                                Thank you for joining. We've reserved your spot and your free horoscope report. We'll notify you as soon as the stars align!
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
                    <Link href="/" className="group inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:dark:text-orange-300">
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
