'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

interface ServiceCardProps {
    icon: string;
    title: string;
    description: string;
    actionText: string;
    actionHref: string;
    gradient?: string;
}

export function ServiceCard({
    icon,
    title,
    description,
    actionText,
    actionHref,
    gradient = 'from-primary/20 to-accent/20',
}: ServiceCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative"
        >
            <Link href={actionHref} className="block">
                <div
                    className={`bg-background border-input relative overflow-hidden rounded-2xl border p-8 shadow-sm transition-all duration-300 hover:shadow-xl`}
                >
                    {/* Gradient border glow effect */}
                    <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-20`}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                        {/* Icon */}
                        <div className="mb-4 text-6xl">{icon}</div>

                        {/* Title */}
                        <h3 className="text-foreground mb-3 text-2xl font-bold">{title}</h3>

                        {/* Description */}
                        <p className="text-muted-foreground mb-6 leading-relaxed">{description}</p>

                        {/* CTA Button */}
                        <div className="inline-flex items-center gap-2 font-semibold text-primary transition-colors group-hover:text-primary/80">
                            {actionText}
                            <svg
                                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/5 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                </div>
            </Link>
        </motion.div>
    );
}
