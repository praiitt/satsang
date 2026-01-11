'use client';

import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/livekit/button';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LanguageSelectorModal() {
    const { hasSelectedLanguage, setLanguage } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay to prevent flash if logic runs instantly, also ensures client-side only
        if (!hasSelectedLanguage) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [hasSelectedLanguage]);

    if (!isVisible) return null;

    const handleSelect = (lang: 'en' | 'hi') => {
        setLanguage(lang);
        setIsVisible(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                <div className="p-6 text-center space-y-6">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-500 bg-clip-text text-transparent">
                            Namaste! 🙏
                        </h2>
                        <p className="text-muted-foreground">
                            Please select your preferred language
                            <br />
                            कृपया अपनी पसंदीदा भाषा चुनें
                        </p>
                    </div>

                    <div className="grid gap-3">
                        <button
                            onClick={() => handleSelect('hi')}
                            className="group relative flex items-center justify-between px-4 py-4 rounded-xl border-2 border-amber-100 dark:border-amber-900/50 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-lg text-amber-900 dark:text-amber-100">हिंदी</span>
                                <span className="text-sm text-muted-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                    Hindi
                                </span>
                            </div>
                            <div className="w-6 h-6 rounded-full border-2 border-amber-200 dark:border-amber-700 group-hover:border-amber-500 group-hover:bg-amber-500 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>

                        <button
                            onClick={() => handleSelect('en')}
                            className="group relative flex items-center justify-between px-4 py-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">English</span>
                                <span className="text-sm text-muted-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300">
                                    English
                                </span>
                            </div>
                            <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-500 group-hover:bg-blue-500 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                        You can change this anytime from the header
                    </p>
                </div>
            </div>
        </div>
    );
}
