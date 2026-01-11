import { cn } from '@/lib/utils';
import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    as?: React.ElementType; // Allow changing the root element (e.g., 'span' for footer)
}

export function Logo({ className, size = 'md' }: LogoProps) {
    // Logo sizes map to pixel heights (approx)
    const sizeMap = {
        sm: 24,
        md: 40,
        lg: 64,
        xl: 80,
    };

    return (
        <img
            src="/branding/logo-horizontal.png"
            alt="RRAASI"
            height={sizeMap[size]}
            className={cn(
                'object-contain',
                className
            )}
            style={{ height: sizeMap[size], width: 'auto' }}
        />
    );
}
