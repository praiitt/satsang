'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Home, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

interface ServiceItem {
    name: string;
    href: string;
    iconPath?: string;
    icon?: any;
    color: string;
}

const services: ServiceItem[] = [
    {
        name: 'Main Menu',
        href: '/',
        icon: Home,
        color: 'border-white/50 shadow-white/20',
    },
    {
        name: 'Satsang',
        href: '/satsang',
        iconPath: '/services/satsang-icon-fixed.png',
        color: 'border-amber-500 shadow-amber-500/50',
    },
    {
        name: 'Music',
        href: '/rraasi-music',
        iconPath: '/services/music-icon-fixed.png',
        color: 'border-cyan-400 shadow-cyan-400/50',
    },
    {
        name: 'Tarot',
        href: '/tarot',
        iconPath: '/services/tarot-icon-fixed.png',
        color: 'border-purple-500 shadow-purple-500/50',
    },
    {
        name: 'Astrology',
        href: '/vedic-jyotish',
        iconPath: '/services/astrology-icon-fixed.png',
        color: 'border-pink-500 shadow-pink-500/50',
    },
    {
        name: 'Art Shop',
        href: '/gallery',
        icon: Palette,
        color: 'border-indigo-400 shadow-indigo-400/50',
    },
];

interface ServiceNavProps {
    className?: string;
    variant?: 'header' | 'vertical-dock';
}

export function ServiceNav({ className, variant = 'header' }: ServiceNavProps) {
    const pathname = usePathname();
    const { language } = useLanguage();
    const isHi = language === 'hi';
    const [expanded, setExpanded] = useState(false);

    const getTranslatedName = (name: string) => {
        if (!isHi) return name;
        switch (name) {
            case 'Main Menu': return 'मुख्य मेनू';
            case 'Satsang': return 'सत्संग';
            case 'Music': return 'संगीत';
            case 'Tarot': return 'टैरो';
            case 'Astrology': return 'ज्योतिष';
            case 'Art Shop': return 'कला की दुकान';
            default: return name;
        }
    };

    // HEADER VARIANT (Static Horizontal)
    if (variant === 'header') {
        return (
            <div className={cn("flex items-center gap-3 sm:gap-6 px-4", className)}>
                {services.map((service) => {
                    const isActive = pathname.startsWith(service.href);
                    return (
                        <Link
                            key={service.name}
                            href={service.href}
                            title={getTranslatedName(service.name)}
                            className="relative group block"
                        >
                            <div className={cn(
                                "w-8 h-8 sm:w-10 sm:h-10 rounded-full",
                                "border-2 border-transparent bg-black/20 backdrop-blur-sm",
                                "flex items-center justify-center overflow-hidden transition-all duration-300",
                                "hover:border-white/20 hover:scale-110",
                                isActive && cn("border-opacity-100 shadow-[0_0_15px_rgba(0,0,0,0.5)] scale-110", service.color)
                            )}>
                                {service.icon ? (
                                    <service.icon className={cn("w-5 h-5 sm:w-6 sm:h-6 text-white opacity-80 group-hover:opacity-100 transition-opacity", isActive && "opacity-100")} />
                                ) : (
                                    <img
                                        src={service.iconPath}
                                        alt={service.name}
                                        className={cn("w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity", isActive && "opacity-100")}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    }

    // VERTICAL DOCK VARIANT (Expandable Side Nav)
    return (
        <>
            {/* Always-visible Toggle Button */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "sticky left-0 top-[80px] z-50",
                    "w-8 h-12 flex items-center justify-center",
                    "bg-background/90 backdrop-blur-xl border-y border-r border-border rounded-r-md shadow-md",
                    "text-foreground/70 hover:text-foreground transition-colors cursor-pointer",
                    "focus:outline-none focus:ring-1 focus:ring-ring",
                    className
                )}
                aria-label={expanded ? "Collapse Menu" : "Expand Menu"}
            >
                {expanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            {/* Sliding Menu Panel */}
            <div
                className={cn(
                    "fixed left-0 top-[80px] z-40",
                    "flex flex-col items-center gap-4 py-6 px-3 pl-2",
                    "bg-background/90 backdrop-blur-xl border-y border-r border-border rounded-r-2xl shadow-2xl",
                    "transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)",
                    expanded ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Service Icons */}
                {services.map((service, i) => {
                    const isActive = pathname.startsWith(service.href);
                    return (
                        <Link
                            key={service.name}
                            href={service.href}
                            title={getTranslatedName(service.name)}
                            className={cn(
                                "relative group transition-all duration-300",
                                "hover:scale-110"
                            )}
                            onClick={() => setExpanded(false)} // Auto-close on selection
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full",
                                "border-2 border-transparent bg-muted/40",
                                "flex items-center justify-center overflow-hidden transition-all duration-300",
                                isActive
                                    ? cn("border-opacity-100 shadow-[0_0_15px_rgba(var(--primary),0.5)]", service.color)
                                    : "hover:border-border"
                            )}>
                                {service.icon ? (
                                    <service.icon className="w-6 h-6 text-foreground transition-transform duration-300 group-hover:scale-110" />
                                ) : (
                                    <img
                                        src={service.iconPath}
                                        alt={service.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                )}
                            </div>

                            {/* Hover Label (Only visible when expanded) */}
                            {expanded && (
                                <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-white/10">
                                    {getTranslatedName(service.name)}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </>
    );
}
