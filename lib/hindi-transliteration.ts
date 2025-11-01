/**
 * Utility to convert Romanized Hindi to Devanagari script
 * This is a basic implementation - for production, consider using a more robust library
 */

// Basic Romanized to Devanagari character mappings
const devanagariMap: Record<string, string> = {
  // Vowels
  a: 'अ',
  aa: 'आ',
  i: 'इ',
  ee: 'ई',
  u: 'उ',
  oo: 'ऊ',
  e: 'ए',
  ai: 'ऐ',
  o: 'ओ',
  au: 'औ',
  am: 'अं',
  ah: 'अः',

  // Consonants
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ng: 'ङ',
  ch: 'च',
  chh: 'छ',
  j: 'ज',
  jh: 'झ',
  ny: 'ञ',
  t: 'ट',
  th: 'ठ',
  d: 'ड',
  dh: 'ढ',
  n: 'ण',
  ta: 'त',
  tha: 'थ',
  da: 'द',
  dha: 'ध',
  na: 'न',
  p: 'प',
  ph: 'फ',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  sh: 'श',
  shh: 'ष',
  s: 'स',
  h: 'ह',

  // Common words (direct mapping)
  namaste: 'नमस्ते',
  aap: 'आप',
  kaise: 'कैसे',
  hain: 'हैं',
  hai: 'है',
  kyon: 'क्यों',
  kya: 'क्या',
  kahe: 'कहे',
  satya: 'सत्य',
  dharma: 'धर्म',
  karma: 'कर्म',
  bhakti: 'भक्ति',
  yoga: 'योग',
  mantra: 'मंत्र',
  bhajan: 'भजन',
  krishna: 'कृष्ण',
  shiv: 'शिव',
  ram: 'राम',
  gita: 'गीता',
  veda: 'वेद',
  upanishad: 'उपनिषद',
  puran: 'पुराण',
  mahadev: 'महादेव',
  ganesh: 'गणेश',
  lakshmi: 'लक्ष्मी',
  saraswati: 'सरस्वती',
  durga: 'दुर्गा',
  bhagwan: 'भगवान',
  devi: 'देवी',
  devta: 'देवता',
};

/**
 * Detects if text appears to be Romanized Hindi
 */
function isRomanizedHindi(text: string): boolean {
  // Basic heuristic: if text contains common Hindi words in Roman script
  const commonHindiWords = [
    'hai',
    'hain',
    'kaise',
    'kya',
    'kyon',
    'aap',
    'tum',
    'main',
    'hum',
    'namaste',
    'dhanyavad',
    'shukriya',
    'satya',
    'dharma',
    'karma',
  ];
  const lowerText = text.toLowerCase();
  return commonHindiWords.some((word) => lowerText.includes(word));
}

/**
 * Attempts to convert Romanized Hindi to Devanagari
 * This is a simplified approach - for better accuracy, use a dedicated transliteration service
 */
export function transliterateToDevanagari(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // If already contains Devanagari characters, return as is
  if (/[\u0900-\u097F]/.test(text)) {
    return text;
  }

  // If doesn't appear to be Hindi, return as is
  if (!isRomanizedHindi(text)) {
    return text;
  }

  // Try direct word mappings first
  let result = text;

  // Sort by length (longest first) to match longer words before shorter ones
  const sortedWords = Object.keys(devanagariMap).sort((a, b) => b.length - a.length);

  for (const romanWord of sortedWords) {
    const regex = new RegExp(`\\b${romanWord}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, devanagariMap[romanWord]);
    }
  }

  // If no conversion happened, return original
  if (result === text) {
    return text;
  }

  return result;
}
