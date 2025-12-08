'use client';

import { motion } from 'motion/react';

export function SacredGeometryBg() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-5">
            <motion.svg
                className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2"
                viewBox="0 0 200 200"
                animate={{
                    rotate: 360,
                }}
                transition={{
                    duration: 180,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            >
                {/* Sri Yantra inspired sacred geometry */}
                {/* Central bindu point */}
                <circle cx="100" cy="100" r="2" fill="currentColor" className="text-primary" />

                {/* Inner triangles */}
                <g className="text-primary" strokeWidth="0.5" fill="none" stroke="currentColor">
                    {/* Downward triangles (Shakti) */}
                    <polygon points="100,60 80,100 120,100" />
                    <polygon points="100,70 85,100 115,100" />

                    {/* Upward triangles (Shiva) */}
                    <polygon points="70,100 100,140 130,100" />
                    <polygon points="80,100 100,130 120,100" />
                </g>

                {/* Concentric circles */}
                <circle
                    cx="100"
                    cy="100"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    className="text-primary/60"
                />
                <circle
                    cx="100"
                    cy="100"
                    r="60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    className="text-primary/40"
                />
                <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    className="text-primary/20"
                />

                {/* Lotus petals (8 petals) */}
                <g className="text-accent" fill="currentColor" fillOpacity="0.1">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                        const radius = 75;
                        const x = 100 + radius * Math.cos((angle * Math.PI) / 180);
                        const y = 100 + radius * Math.sin((angle * Math.PI) / 180);
                        return (
                            <ellipse
                                key={i}
                                cx={x}
                                cy={y}
                                rx="8"
                                ry="15"
                                transform={`rotate(${angle} ${x} ${y})`}
                            />
                        );
                    })}
                </g>

                {/* Outer square (bhupura) */}
                <rect
                    x="20"
                    y="20"
                    width="160"
                    height="160"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    className="text-primary/30"
                />
            </motion.svg>

            {/* Additional subtle Om symbol in corner */}
            <motion.div
                className="text-muted-foreground/30 absolute bottom-10 right-10 text-9xl"
                animate={{
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                ॐ
            </motion.div>
        </div>
    );
}
