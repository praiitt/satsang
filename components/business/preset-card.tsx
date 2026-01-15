'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresetCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    isActive: boolean;
    onClick: () => void;
    colorTheme: 'orange' | 'blue' | 'purple' | 'green' | 'red';
}

export function PresetCard({
    title,
    description,
    icon: Icon,
    isActive,
    onClick,
    colorTheme,
}: PresetCardProps) {
    const colorMap = {
        orange: 'bg-orange-500/10 border-orange-500/50 text-orange-500 hover:bg-orange-500/20',
        blue: 'bg-blue-500/10 border-blue-500/50 text-blue-500 hover:bg-blue-500/20',
        purple: 'bg-purple-500/10 border-purple-500/50 text-purple-500 hover:bg-purple-500/20',
        green: 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20',
        red: 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20',
    };

    const activeColorMap = {
        orange: 'bg-orange-500 text-white border-orange-600',
        blue: 'bg-blue-500 text-white border-blue-600',
        purple: 'bg-purple-500 text-white border-purple-600',
        green: 'bg-green-500 text-white border-green-600',
        red: 'bg-red-500 text-white border-red-600',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                'relative flex h-full w-full flex-col items-start justify-between rounded-xl border-2 p-6 transition-all duration-300',
                isActive ? activeColorMap[colorTheme] : colorMap[colorTheme],
                isActive ? 'shadow-lg' : 'hover:shadow-md'
            )}
        >
            <div className="mb-4 rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <Icon size={32} strokeWidth={1.5} />
            </div>
            <div className="text-left">
                <h3 className="mb-1 text-xl font-bold">{title}</h3>
                <p className={cn('text-sm', isActive ? 'text-white/90' : 'text-muted-foreground')}>
                    {description}
                </p>
            </div>
            {isActive && (
                <div className="absolute right-4 top-4">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-3 w-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    />
                </div>
            )}
        </motion.button>
    );
}
