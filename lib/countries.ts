/**
 * Country data with country codes for phone number input
 */

export interface Country {
  code: string; // ISO country code (e.g., 'IN', 'US')
  name: string; // Country name in English
  nameHindi: string; // Country name in Hindi
  dialCode: string; // Phone country code (e.g., '+91', '+1')
  flag: string; // Emoji flag
}

export const countries: Country[] = [
  { code: 'IN', name: 'India', nameHindi: 'भारत', dialCode: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', nameHindi: 'संयुक्त राज्य', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameHindi: 'यूनाइटेड किंगडम', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', nameHindi: 'कनाडा', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', nameHindi: 'ऑस्ट्रेलिया', dialCode: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', nameHindi: 'न्यूज़ीलैंड', dialCode: '+64', flag: '🇳🇿' },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    nameHindi: 'संयुक्त अरब अमीरात',
    dialCode: '+971',
    flag: '🇦🇪',
  },
  { code: 'SA', name: 'Saudi Arabia', nameHindi: 'सऊदी अरब', dialCode: '+966', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', nameHindi: 'सिंगापुर', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', nameHindi: 'मलेशिया', dialCode: '+60', flag: '🇲🇾' },
  { code: 'BD', name: 'Bangladesh', nameHindi: 'बांग्लादेश', dialCode: '+880', flag: '🇧🇩' },
  { code: 'PK', name: 'Pakistan', nameHindi: 'पाकिस्तान', dialCode: '+92', flag: '🇵🇰' },
  { code: 'NP', name: 'Nepal', nameHindi: 'नेपाल', dialCode: '+977', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', nameHindi: 'श्रीलंका', dialCode: '+94', flag: '🇱🇰' },
  { code: 'ZA', name: 'South Africa', nameHindi: 'दक्षिण अफ्रीका', dialCode: '+27', flag: '🇿🇦' },
  { code: 'DE', name: 'Germany', nameHindi: 'जर्मनी', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', nameHindi: 'फ्रांस', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', nameHindi: 'इटली', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', nameHindi: 'स्पेन', dialCode: '+34', flag: '🇪🇸' },
  { code: 'JP', name: 'Japan', nameHindi: 'जापान', dialCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', nameHindi: 'चीन', dialCode: '+86', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', nameHindi: 'दक्षिण कोरिया', dialCode: '+82', flag: '🇰🇷' },
];

// Default country (India)
export const DEFAULT_COUNTRY: Country = countries[0];

/**
 * Find country by country code
 */
export function findCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

/**
 * Find country by dial code
 */
export function findCountryByDialCode(dialCode: string): Country | undefined {
  return countries.find((c) => c.dialCode === dialCode);
}
