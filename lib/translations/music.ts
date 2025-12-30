import { musicTranslationsEn } from './music-en';
import { musicTranslationsHi } from './music-hi';

export type Language = 'en' | 'hi';

export const musicTranslations = {
    en: musicTranslationsEn,
    hi: musicTranslationsHi,
} as const;

export function getMusicTranslation(language: Language, key: string): string {
    const keys = key.split('.');
    let value: any = musicTranslations[language];

    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            value = undefined;
            break;
        }
    }

    return typeof value === 'string' ? value : key;
}

export function useMusicTranslation(language: Language) {
    return (key: string) => getMusicTranslation(language, key);
}
