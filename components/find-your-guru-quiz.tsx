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
        id: 1,
        textKey: 'quiz.questions.q1',
        options: [
            { textKey: 'quiz.options.peace', tags: ['Meditation', 'Advaita', 'Self-inquiry'] },
            { textKey: 'quiz.options.knowledge', tags: ['Vedanta', 'Philosophy', 'Gita'] },
            { textKey: 'quiz.options.love', tags: ['Bhakti', 'Devotion', 'Kirtan'] },
            { textKey: 'quiz.options.energy', tags: ['Kriya Yoga', 'Tantra', 'Kundalini'] },
        ],
    },
    {
        id: 2,
        textKey: 'quiz.questions.q2',
        options: [
            { textKey: 'quiz.options.intellectual', tags: ['Vedanta', 'Philosophy', 'Jnana'] },
            { textKey: 'quiz.options.emotional', tags: ['Bhakti', 'Devotion', 'Love'] },
            { textKey: 'quiz.options.practical', tags: ['Karma Yoga', 'Action', 'Service'] },
            { textKey: 'quiz.options.mystical', tags: ['Mysticism', 'Tantra', 'Esoteric'] },
        ],
    },
    {
        id: 3,
        textKey: 'quiz.questions.q3',
        options: [
            { textKey: 'quiz.options.ancient', tags: ['Traditional', 'Vedic', 'Scriptures'] },
            { textKey: 'quiz.options.modern', tags: ['Modern', 'Psychology', 'Science'] },
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
            guru.tags.forEach((tag) => {
                if (finalScores[tag]) {
                    score += finalScores[tag];
                }
            });
            return { guru, score };
        });

        guruScores.sort((a, b) => b.score - a.score);
        // Get top 2 recommendations
        setRecommendations(guruScores.slice(0, 2).map((g) => g.guru));
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-br from-orange-50 to-white p-6">
                                <h2 className="text-xl font-serif font-semibold text-orange-900">
                                    {showResult ? t('quiz.modalTitleResult') : t('quiz.modalTitle')}
                                </h2>
                                <button
                                    onClick={closeQuiz}
                                    className="rounded-full p-2 text-orange-400 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <AnimatePresence mode="wait">
                                    {!showResult ? (
                                        <motion.div
                                            key="question"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <span className="text-xs font-bold tracking-wider text-orange-500 uppercase">
                                                    Question {currentQuestion + 1} of {QUESTIONS.length}
                                                </span>
                                                <h3 className="text-2xl font-medium text-gray-900">
                                                    {t(QUESTIONS[currentQuestion].textKey)}
                                                </h3>
                                            </div>

                                            <div className="grid gap-3">
                                                {QUESTIONS[currentQuestion].options.map((option, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAnswer(option.tags)}
                                                        className="flex items-center justify-between w-full p-4 text-left transition-all border rounded-xl hover:border-orange-500 hover:bg-orange-50 group"
                                                    >
                                                        <span className="font-medium text-gray-700 group-hover:text-orange-700">
                                                            {t(option.textKey)}
                                                        </span>
                                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="result"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-4">
                                                {recommendations.map((guru, idx) => (
                                                    <div
                                                        key={guru.id}
                                                        className="flex items-start gap-4 p-4 border border-orange-100 rounded-xl bg-orange-50/50"
                                                    >
                                                        <div className="relative flex items-center justify-center w-16 h-16 overflow-hidden text-3xl bg-white border-2 border-white rounded-full shadow-sm shrink-0">
                                                            {guru.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="text-lg font-bold text-gray-900 truncate">
                                                                    {t(guru.nameKey)}
                                                                </h4>
                                                                {idx === 0 && (
                                                                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-orange-500 rounded-full">
                                                                        Top {t('quiz.results.match')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                                                {t(guru.taglineKey)}
                                                            </p>
                                                            <Link
                                                                href={guru.route}
                                                                onClick={closeQuiz}
                                                                className="inline-flex items-center text-sm font-semibold text-orange-600 hover:text-orange-700"
                                                            >
                                                                {t('quiz.results.connect')} <ChevronRight className="w-4 h-4 ml-1" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={resetQuiz}
                                                className="flex items-center justify-center w-full gap-2 py-3 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                {t('quiz.results.retake')}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
