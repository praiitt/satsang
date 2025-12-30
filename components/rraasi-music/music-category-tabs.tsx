'use client';

import { useState } from 'react';

export type MusicCategory = 'all' | 'bhajan' | 'mantra' | 'meditation' | 'healing' | 'yoga' | 'my-music' | 'other';

interface CategoryTab {
    id: MusicCategory;
    label: string;
    labelHi: string;
    icon: string;
}

const categories: CategoryTab[] = [
    { id: 'all', label: 'All Music', labelHi: 'सभी संगीत', icon: '🎵' },
    { id: 'bhajan', label: 'Bhajans', labelHi: 'भजन', icon: '🙏' },
    { id: 'mantra', label: 'Mantras', labelHi: 'मंत्र', icon: '🕉️' },
    { id: 'meditation', label: 'Meditation', labelHi: 'ध्यान', icon: '🧘' },
    { id: 'healing', label: 'Healing', labelHi: 'हीलिंग', icon: '🎵' },
    { id: 'yoga', label: 'Yoga', labelHi: 'योग', icon: '🌸' },
];

interface MusicCategoryTabsProps {
    activeCategory: MusicCategory;
    onCategoryChange: (category: MusicCategory) => void;
    language?: 'en' | 'hi';
}

export function MusicCategoryTabs({
    activeCategory,
    onCategoryChange,
    language = 'en'
}: MusicCategoryTabsProps) {
    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={`
              px-4 py-2.5 rounded-full font-medium transition-all duration-200
              flex items-center gap-2 whitespace-nowrap
              ${activeCategory === category.id
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg scale-105'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }
            `}
                    >
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-sm font-semibold">
                            {language === 'hi' ? category.labelHi : category.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
