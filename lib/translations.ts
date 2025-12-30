import { en } from './translations/en';
import { hi } from './translations/hi';

export type Language = 'en' | 'hi';

export const translations = {
  en,
  hi,
} as const;

export function getTranslation(language: Language, key: string): string {
  const keys = key.split('.');
  let value: unknown = translations[language] as unknown;

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  return typeof value === 'string' ? value : key;
}

export function useTranslation(language: Language) {
  return (key: string) => getTranslation(language, key);
}
