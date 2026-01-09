import { cn } from '@/lib/utils';
import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    as?: React.ElementType; // Allow changing the root element (e.g., 'span' for footer)
}

export function Logo({ className, size = 'md', as: Component = 'h1' }: LogoProps) {
    const sizeClasses = {
        sm: 'text-2xl',
        md: 'text-3xl sm:text-4xl',
        lg: 'text-5xl',
        xl: 'text-6xl',
    };

    return (
        <Component
            className={cn(
                'font-cinzel font-bold tracking-wide text-gradient-gold drop-shadow-sm',
                sizeClasses[size],
                className
            )}
        >
            RRAASI
        </Component>
    );
}
