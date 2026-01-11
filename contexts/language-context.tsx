'use client';

import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { type Language, translations } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  hasSelectedLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('hi');
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);

  // Load language from URL param or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check URL param first
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('ln');

      if (urlLang && (urlLang === 'en' || urlLang === 'hi')) {
        setLanguageState(urlLang as Language);
        localStorage.setItem('language', urlLang);
        setHasSelectedLanguage(true);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('language') as Language;
        if (saved && (saved === 'en' || saved === 'hi')) {
          setLanguageState(saved);
          setHasSelectedLanguage(true);
        } else {
          // No preference found, user hasn't selected yet
          setHasSelectedLanguage(false);
        }
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setHasSelectedLanguage(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };

  // Memoize translation function so it updates when language changes
  const t = useMemo(() => {
    return (key: string) => {
      const keys = key.split('.');
      let value: any = translations[language];

      // Debug: Log what we're trying to access
      if (typeof window !== 'undefined' && key.startsWith('rraasHome')) {
        console.log('[Translation Debug]', {
          key,
          language,
          hasTranslations: !!translations[language],
          firstKey: keys[0],
          hasFirstKey: !!(translations[language] as any)?.[keys[0]]
        });
      }

      for (const k of keys) {
        value = value?.[k];
      }

      return value || key;
    };
  }, [language]);

  // Memoize context value to ensure re-renders when language changes
  const contextValue = useMemo(() => ({ language, setLanguage, t, hasSelectedLanguage }), [language, t, hasSelectedLanguage]);

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
