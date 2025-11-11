'use client';

import { Globe } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors sm:px-3 sm:text-sm"
      title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
    >
      <Globe className="h-4 w-4 sm:h-5 sm:w-5" weight="fill" />
      <span className="font-medium">{language === 'en' ? 'हिंदी' : 'English'}</span>
    </button>
  );
}
