"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/livekit/button';
import { GURUS, GuruDefinition } from '@/lib/gurus';
import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';

interface QuizQuestion {
    id: number;
    textKey: string;
    options: {
        textKey: string;
        tags: string[];
    }[];
}

const QUESTIONS: QuizQuestion[] = [
    {
        id: 0,
        textKey: 'quiz.questions.q0',
        options: [
            { textKey: 'quiz.options.all_traditions', tags: ['All'] },
            { textKey: 'quiz.options.hindu_vedic', tags: ['hinduism'] },
            { textKey: 'quiz.options.buddhist_jain', tags: ['buddhism', 'jainism'] },
            { textKey: 'quiz.options.abrahamic_sufi', tags: ['islam', 'christianity', 'judaism', 'sikhism'] },
        ],
    },
    {
        id: 1,
        textKey: 'quiz.questions.q1', // Seeking most?
        options: [
            { textKey: 'quiz.options.peace', tags: ['Meditation', 'Peace', 'Zen', 'Vipassana'] },
            { textKey: 'quiz.options.knowledge', tags: ['Vedanta', 'Jnana', 'Knowledge', 'Advaita', 'Philosophy'] },
            { textKey: 'quiz.options.love', tags: ['Bhakti', 'Devotion', 'Love', 'Sufi', 'Mystic'] },
            { textKey: 'quiz.options.energy', tags: ['Kriya Yoga', 'Tantra', 'Kundalini', 'Energy'] },
        ],
    },
    {
        id: 2,
        textKey: 'quiz.questions.q2', // Connect preference?
        options: [
            { textKey: 'quiz.options.intellectual', tags: ['Vedanta', 'Philosophy', 'Jnana'] },
            { textKey: 'quiz.options.emotional', tags: ['Bhakti', 'Devotion', 'Love', 'Sufi'] },
            { textKey: 'quiz.options.practical', tags: ['Karma Yoga', 'Action', 'Service', 'Modern'] },
            { textKey: 'quiz.options.mystical', tags: ['Mysticism', 'Tantra', 'Esoteric'] },
        ],
    },
    {
        id: 3,
        textKey: 'quiz.questions.q3', // Vibe?
        options: [
            { textKey: 'quiz.options.ancient', tags: ['Traditional', 'Vedic', 'Scriptures', 'Ancient'] },
            { textKey: 'quiz.options.modern', tags: ['Modern', 'Psychology', 'Science', 'Contemporary'] },
            { textKey: 'quiz.options.intense', tags: ['Direct', 'Radical', 'Transformation'] },
            { textKey: 'quiz.options.gentle', tags: ['Compassion', 'Mother', 'Healing'] },
        ],
    },
];

export function FindYourGuruQuiz({ trigger }: { trigger?: React.ReactNode }) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [recommendations, setRecommendations] = useState<GuruDefinition[]>([]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Reset quiz when closed
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setCurrentQuestion(0);
                setScores({});
                setShowResult(false);
                setRecommendations([]);
            }, 300);
        }
    }, [isOpen]);

    const handleAnswer = (tags: string[]) => {
        const newScores = { ...scores };
        tags.forEach((tag) => {
            newScores[tag] = (newScores[tag] || 0) + 1;
        });
        setScores(newScores);

        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            calculateResult(newScores);
        }
    };

    const calculateResult = (finalScores: Record<string, number>) => {
        const guruScores = GURUS.map((guru) => {
            let score = 0;
            // Get all user selected tags
            const userTags = Object.keys(finalScores);

            userTags.forEach((userTag) => {
                const userTagLower = userTag.toLowerCase();
                const weight = finalScores[userTag];

                // If user selected 'All', everyone gets a boost
                if (userTag === 'All') {
                    score += weight; // Base score for everyone
                    return;
                }

                // Check if guru has a matching tag (case-insensitive partial match for robust logic)
                // e.g. User tag 'Bhakti' matches guru tag 'Bhakti Yoga'
                const hasMatch = guru.tags.some(guruTag =>
                    guruTag.toLowerCase().includes(userTagLower) ||
                    userTagLower.includes(guruTag.toLowerCase())
                );

                if (hasMatch) {
                    score += weight * 2; // Exact/Partial match gets higher weight
                }
            });

            return { guru, score };
        });

        // Debug log to see scoring if needed
        // console.log('Guru Scores:', guruScores.sort((a, b) => b.score - a.score).map(g => `${g.guru.name}: ${g.score}`));

        guruScores.sort((a, b) => b.score - a.score);
        // Get top 3 recommendations (increased from 2)
        setRecommendations(guruScores.slice(0, 3).map((g) => g.guru));
        setShowResult(true);
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setScores({});
        setShowResult(false);
        setRecommendations([]);
    };

    const closeQuiz = () => setIsOpen(false);

    return (
        <>
            <div onClick={() => setIsOpen(true)}>
                {trigger || (
                    <Button variant="secondary" className="gap-2 rounded-full border border-orange-200 bg-white hover:bg-orange-50 text-orange-700 shadow-sm">
                        <Sparkles className="w-4 h-4" />
                        {t('quiz.triggerButton')}
                    </Button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeQuiz}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-zinc-950 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
                                <h2 className="text-xl font-serif font-semibold text-white">
                                    {showResult ? t('quiz.modalTitleResult') : t('quiz.modalTitle')}
                                </h2>
                                <button
                                    onClick={closeQuiz}
                                    className="rounded-full p-2 text-zinc-500 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                <AnimatePresence mode="wait">
                                    {!showResult ? (
                                        <motion.div
                                            key="question"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-px w-8 bg-orange-500/50" />
                                                    <span className="text-[10px] font-bold tracking-[0.2em] text-orange-500 uppercase">
                                                        {t('quiz.step')} {currentQuestion + 1} / {QUESTIONS.length}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl md:text-3xl font-medium text-white leading-tight">
                                                    {t(QUESTIONS[currentQuestion].textKey)}
                                                </h3>
                                            </div>

                                            <div className="grid gap-4">
                                                {QUESTIONS[currentQuestion].options.map((option, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAnswer(option.tags)}
                                                        className="flex items-center justify-between w-full p-5 text-left transition-all border border-white/5 rounded-2xl bg-white/5 hover:border-orange-500/50 hover:bg-orange-500/5 group"
                                                    >
                                                        <span className="font-medium text-zinc-300 group-hover:text-white group-active:scale-95 transition-all text-lg">
                                                            {t(option.textKey)}
                                                        </span>
                                                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-orange-500 group-hover:border-orange-500 transition-all">
                                                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <button
                                                    onClick={closeQuiz}
                                                    className="w-full py-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors"
                                                >
                                                    {t('common.cancel') || 'Cancel'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="result"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-8"
                                        >
                                            <div className="space-y-4">
                                                {recommendations.map((guru, idx) => (
                                                    <div
                                                        key={guru.id}
                                                        className="flex items-start gap-5 p-5 border border-white/5 rounded-[1.5rem] bg-white/[0.03] hover:bg-white/[0.05] transition-all"
                                                    >
                                                        <div className="relative flex items-center justify-center w-20 h-20 overflow-hidden text-4xl bg-zinc-900 border border-white/10 rounded-2xl shadow-xl shrink-0">
                                                            {guru.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0 py-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-xl font-bold text-white truncate">
                                                                    {t(guru.nameKey)}
                                                                </h4>
                                                                {idx === 0 && (
                                                                    <span className="px-3 py-1 text-[10px] font-bold tracking-wider text-white bg-orange-600 rounded-full uppercase shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                                                                        {t('quiz.results.match')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                                                                {t(guru.taglineKey)}
                                                            </p>
                                                            <Link
                                                                href={guru.route}
                                                                onClick={closeQuiz}
                                                                className="inline-flex items-center text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-widest"
                                                            >
                                                                {t('quiz.results.connect')} <ChevronRight className="w-4 h-4 ml-1" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={resetQuiz}
                                                className="flex items-center justify-center w-full gap-3 py-4 text-xs font-bold text-zinc-500 transition-all hover:text-orange-400 group uppercase tracking-[0.2em]"
                                            >
                                                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                                {t('quiz.results.retake')}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
