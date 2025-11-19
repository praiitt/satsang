/**
 * Guru Configuration
 *
 * Central configuration for all spiritual gurus/agents available on RRAASI.
 * This drives the multi-guru landing page and guru directory.
 */

export type GuruTradition =
  | 'Hindu'
  | 'Sanatana Dharma'
  | 'Zen'
  | 'Buddhist'
  | 'Sufi'
  | 'ET/Consciousness'
  | 'Modern'
  | 'Universal';

export interface GuruDefinition {
  id: string;
  route: string;
  agentName: string;
  name: string;
  nameKey: string; // Translation key for name
  tradition: GuruTradition;
  tagline: string;
  taglineKey: string; // Translation key for tagline
  description: string;
  descriptionKey: string; // Translation key for description
  tags: string[];
  icon: string; // Emoji or icon identifier
  isFeatured: boolean;
  color?: string; // Optional accent color
}

export const GURUS: GuruDefinition[] = [
  {
    id: 'guruji',
    route: '/',
    agentName: 'guruji',
    name: 'Guruji',
    nameKey: 'gurus.guruji.name',
    tradition: 'Sanatana Dharma',
    tagline: 'Your spiritual guide rooted in Hindu and Sanatana Dharma',
    taglineKey: 'gurus.guruji.tagline',
    description:
      'A compassionate spiritual guru specializing in dharma, yoga, meditation, karma, bhakti, and Vedanta. Answers questions from Gita, Vedas, Upanishads, Ramayana, and Mahabharata.',
    descriptionKey: 'gurus.guruji.description',
    tags: ['Hindu', 'Dharma', 'Bhakti', 'Yoga', 'Meditation', 'Vedanta'],
    icon: '🕉️',
    isFeatured: true,
    color: '#ff7a00',
  },
  {
    id: 'etagent',
    route: '/et-agent',
    agentName: 'etagent',
    name: 'ET Agent',
    nameKey: 'gurus.etAgent.name',
    tradition: 'ET/Consciousness',
    tagline: 'Explore extraterrestrial civilizations and cosmic consciousness',
    taglineKey: 'gurus.etAgent.tagline',
    description:
      'A guide specializing in extraterrestrial civilizations, the Fermi Paradox, and the connection between sound frequencies and universal consciousness.',
    descriptionKey: 'gurus.etAgent.description',
    tags: ['ET', 'Fermi Paradox', 'Consciousness', 'Frequencies', 'Cosmic'],
    icon: '👽',
    isFeatured: true,
    color: '#6366f1',
  },
  {
    id: 'osho',
    route: '/osho',
    agentName: 'osho',
    name: 'Osho',
    nameKey: 'gurus.osho.name',
    tradition: 'Modern',
    tagline: 'Revolutionary spiritual master of meditation and consciousness',
    taglineKey: 'gurus.osho.tagline',
    description:
      'Osho (Bhagwan Shree Rajneesh) - A revolutionary spiritual guide specializing in meditation, consciousness, Zen philosophy, dynamic meditation, sannyas, and the art of living.',
    descriptionKey: 'gurus.osho.description',
    tags: ['Meditation', 'Zen', 'Consciousness', 'Dynamic Meditation', 'Sannyas'],
    icon: '🧘',
    isFeatured: true,
    color: '#f59e0b',
  },
];

/**
 * Get guru by ID
 */
export function getGuruById(id: string): GuruDefinition | undefined {
  return GURUS.find((guru) => guru.id === id);
}

/**
 * Get guru by route
 */
export function getGuruByRoute(route: string): GuruDefinition | undefined {
  return GURUS.find((guru) => guru.route === route);
}

/**
 * Get featured gurus
 */
export function getFeaturedGurus(): GuruDefinition[] {
  return GURUS.filter((guru) => guru.isFeatured);
}

/**
 * Get gurus by tradition
 */
export function getGurusByTradition(tradition: GuruTradition): GuruDefinition[] {
  return GURUS.filter((guru) => guru.tradition === tradition);
}

/**
 * Get all unique traditions
 */
export function getAllTraditions(): GuruTradition[] {
  return Array.from(new Set(GURUS.map((guru) => guru.tradition)));
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const allTags = GURUS.flatMap((guru) => guru.tags);
  return Array.from(new Set(allTags)).sort();
}
