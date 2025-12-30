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
    route: '/guruji',
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
    id: 'psychedelic_guru',
    route: '/psychedelic-guru',
    agentName: 'psychedelic-agent',
    name: 'Psychedelic Guide',
    nameKey: 'gurus.psychedelicGuru.name',
    tradition: 'ET/Consciousness',
    tagline: 'Natural expanded states through music & insight',
    taglineKey: 'gurus.psychedelicGuru.tagline',
    description:
      'A guide to natural psychedelic states through music, breath, and silence. No chemicals, just consciousness.',
    descriptionKey: 'gurus.psychedelicGuru.description',
    tags: ['Psychedelic', 'Music', 'Consciousness', 'Breathwork', 'Insight'],
    icon: '🍄',
    isFeatured: true,
    color: '#8b5cf6',
  },
  {
    id: 'tarot',
    route: '/tarot',
    agentName: 'tarot-agent',
    name: 'Mystic Tarot Reader',
    nameKey: 'gurus.tarot.name',
    tradition: 'Universal',
    tagline: 'Reveal insights about Love, Career, and Finance',
    taglineKey: 'gurus.tarot.tagline',
    description:
      'Connect with the cards to reveal insights about Love, Career, and Finance. The stars impel, they do not compel.',
    descriptionKey: 'gurus.tarot.description',
    tags: ['Tarot', 'Divination', 'Guidance', 'Intuition', 'Cards'],
    icon: '🔮',
    isFeatured: true,
    color: '#9333ea',
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
  // Hindu Spiritual Masters
  {
    id: 'vivekananda',
    route: '/hinduism/vivekananda',
    agentName: 'hinduism-agent',
    name: 'Swami Vivekananda',
    nameKey: 'gurus.vivekananda.name',
    tradition: 'Hindu',
    tagline: 'Bold voice of Vedanta and strength',
    taglineKey: 'gurus.vivekananda.tagline',
    description: 'Swami Vivekananda - Champion of practical Vedanta, Karma Yoga, and spiritual strength. "Arise, awake, and stop not till the goal is reached!"',
    descriptionKey: 'gurus.vivekananda.description',
    tags: ['Vedanta', 'Karma Yoga', 'Strength', 'Service'],
    icon: '💪',
    isFeatured: true,
    color: '#ff6b35',
  },
  {
    id: 'ramana',
    route: '/hinduism/ramana',
    agentName: 'hinduism-agent',
    name: 'Ramana Maharshi',
    nameKey: 'gurus.ramana.name',
    tradition: 'Hindu',
    tagline: 'Master of Self-inquiry and silence',
    taglineKey: 'gurus.ramana.tagline',
    description: 'Ramana Maharshi - Sage of Arunachala teaching direct path to Self through the question "Who am I?"',
    descriptionKey: 'gurus.ramana.description',
    tags: ['Self-inquiry', 'Advaita', 'Silence', 'Meditation'],
    icon: '🙏',
    isFeatured: true,
    color: '#8b5cf6',
  },
  {
    id: 'shankaracharya',
    route: '/hinduism/shankaracharya',
    agentName: 'hinduism-agent',
    name: 'Adi Shankaracharya',
    nameKey: 'gurus.shankaracharya.name',
    tradition: 'Hindu',
    tagline: 'Great philosopher of Advaita Vedanta',
    taglineKey: 'gurus.shankaracharya.tagline',
    description: 'Adi Shankaracharya - Ancient philosopher who established Advaita (non-dualism). "Brahma Satyam Jagat Mithya"',
    descriptionKey: 'gurus.shankaracharya.description',
    tags: ['Advaita', 'Philosophy', 'Vedanta', 'Non-dualism'],
    icon: '📿',
    isFeatured: false,
    color: '#f97316',
  },
  {
    id: 'ramakrishna',
    route: '/hinduism/ramakrishna',
    agentName: 'hinduism-agent',
    name: 'Sri Ramakrishna',
    nameKey: 'gurus.ramakrishna.name',
    tradition: 'Hindu',
    tagline: 'Ecstatic devotee of Divine Mother',
    taglineKey: 'gurus.ramakrishna.tagline',
    description: 'Sri Ramakrishna Paramahamsa - Mystic who realized unity of all religions through direct experience of God.',
    descriptionKey: 'gurus.ramakrishna.description',
    tags: ['Bhakti', 'Divine Mother', 'Unity', 'Devotion'],
    icon: '🌺',
    isFeatured: false,
    color: '#ec4899',
  },
  {
    id: 'aurobindo',
    route: '/hinduism/aurobindo',
    agentName: 'hinduism-agent',
    name: 'Sri Aurobindo',
    nameKey: 'gurus.aurobindo.name',
    tradition: 'Hindu',
    tagline: 'Visionary of Integral Yoga',
    taglineKey: 'gurus.aurobindo.tagline',
    description: 'Sri Aurobindo - Pioneer of Integral Yoga and evolutionary spirituality. Envisioned divine life on Earth.',
    descriptionKey: 'gurus.aurobindo.description',
    tags: ['Integral Yoga', 'Evolution', 'Consciousness', 'Transformation'],
    icon: '🌟',
    isFeatured: false,
    color: '#3b82f6',
  },
  {
    id: 'anandamayi_ma',
    route: '/hinduism/anandamayi_ma',
    agentName: 'hinduism-agent',
    name: 'Anandamayi Ma',
    nameKey: 'gurus.anandamayiMa.name',
    tradition: 'Hindu',
    tagline: 'Bliss-permeated Divine Mother',
    taglineKey: 'gurus.anandamayiMa.tagline',
    description: 'Anandamayi Ma - Spontaneous joy embodied. The bliss-permeated mother who lived in constant God-remembrance.',
    descriptionKey: 'gurus.anandamayiMa.description',
    tags: ['Divine Mother', 'Bliss', 'Devotion', 'Spontaneity'],
    icon: '😇',
    isFeatured: false,
    color: '#f472b6',
  },
  {
    id: 'neem_karoli_baba',
    route: '/hinduism/neem_karoli_baba',
    agentName: 'hinduism-agent',
    name: 'Neem Karoli Baba',
    nameKey: 'gurus.neemKaroliBaba.name',
    tradition: 'Hindu',
    tagline: 'Saint of unconditional love',
    taglineKey: 'gurus.neemKaroliBaba.tagline',
    description: 'Neem Karoli Baba (Maharajji) - Beloved saint radiating unconditional love. "Sub Ek - All is One"',
    descriptionKey: 'gurus.neemKaroliBaba.description',
    tags: ['Love', 'Service', 'Hanuman', 'Miracles'],
    icon: '❤️',
    isFeatured: true,
    color: '#ef4444',
  },
  {
    id: 'yogananda',
    route: '/hinduism/yogananda',
    agentName: 'hinduism-agent',
    name: 'Paramahansa Yogananda',
    nameKey: 'gurus.yogananda.name',
    tradition: 'Hindu',
    tagline: 'Bridge between East and West',
    taglineKey: 'gurus.yogananda.tagline',
    description: 'Paramahansa Yogananda - Brought Kriya Yoga to the West. Author of "Autobiography of a Yogi"',
    descriptionKey: 'gurus.yogananda.description',
    tags: ['Kriya Yoga', 'Self-Realization', 'Joy', 'Science'],
    icon: '🌏',
    isFeatured: false,
    color: '#06b6d4',
  },
  {
    id: 'krishnamurti',
    route: '/hinduism/krishnamurti',
    agentName: 'hinduism-agent',
    name: 'J. Krishnamurti',
    nameKey: 'gurus.krishnamurti.name',
    tradition: 'Hindu',
    tagline: 'Teacher of radical freedom',
    taglineKey: 'gurus.krishnamurti.tagline',
    description: 'Jiddu Krishnamurti - "Truth is a pathless land." Teacher of freedom from all conditioning and authority.',
    descriptionKey: 'gurus.krishnamurti.description',
    tags: ['Freedom', 'Inquiry', 'Awareness', 'No-method'],
    icon: '🦅',
    isFeatured: false,
    color: '#64748b',
  },
  {
    id: 'ravi_shankar',
    route: '/hinduism/ravi_shankar',
    agentName: 'hinduism-agent',
    name: 'Sri Sri Ravi Shankar',
    nameKey: 'gurus.raviShankar.name',
    tradition: 'Hindu',
    tagline: 'Founder of Art of Living',
    taglineKey: 'gurus.raviShankar.tagline',
    description: 'Sri Sri Ravi Shankar - Global humanitarian teaching stress-free living through Sudarshan Kriya and meditation.',
    descriptionKey: 'gurus.raviShankar.description',
    tags: ['Art of Living', 'Pranayama', 'Service', 'Peace'],
    icon: '😊',
    isFeatured: false,
    color: '#10b981',
  },
  {
    id: 'sadhguru',
    route: '/hinduism/sadhguru',
    agentName: 'hinduism-agent',
    name: 'Sadhguru',
    nameKey: 'gurus.sadhguru.name',
    tradition: 'Hindu',
    tagline: 'Modern yogi and Inner Engineering',
    taglineKey: 'gurus.sadhguru.tagline',
    description: 'Sadhguru Jaggi Vasudev - Contemporary mystic making yoga accessible. "This is not philosophy, this is technology"',
    descriptionKey: 'gurus.sadhguru.description',
    tags: ['Inner Engineering', 'Yoga', 'Modern', 'Practical'],
    icon: '🧘‍♂️',
    isFeatured: true,
    color: '#f59e0b',
  },
  {
    id: 'amma',
    route: '/hinduism/amma',
    agentName: 'hinduism-agent',
    name: 'Mata Amritanandamayi',
    nameKey: 'gurus.amma.name',
    tradition: 'Hindu',
    tagline: 'The Hugging Saint',
    taglineKey: 'gurus.amma.tagline',
    description: 'Mata Amritanandamayi (Amma) - Universal mother embodying compassion. Has hugged millions worldwide.',
    descriptionKey: 'gurus.amma.description',
    tags: ['Compassion', 'Service', 'Love', 'Humanitarian'],
    icon: '🤗',
    isFeatured: false,
    color: '#ec4899',
  },
  {
    id: 'morari_bapu',
    route: '/hinduism/morari_bapu',
    agentName: 'hinduism-agent',
    name: 'Morari Bapu',
    nameKey: 'gurus.morariBapu.name',
    tradition: 'Hindu',
    tagline: 'Master narrator of Ram Katha',
    taglineKey: 'gurus.morariBapu.tagline',
    description: 'Morari Bapu - Beloved storyteller of Ramcharitmanas, spreading Ram\'s message of truth, love, and compassion.',
    descriptionKey: 'gurus.morariBapu.description',
    tags: ['Ram Katha', 'Ramayana', 'Storytelling', 'Devotion'],
    icon: '📖',
    isFeatured: false,
    color: '#f97316',
  },
  {
    id: 'rakeshbhai',
    route: '/hinduism/rakeshbhai',
    agentName: 'hinduism-agent',
    name: 'Rakeshbhai Jhaveri',
    nameKey: 'gurus.rakeshbhai.name',
    tradition: 'Hindu',
    tagline: 'Modern spirituality for daily life',
    taglineKey: 'gurus.rakeshbhai.tagline',
    description: 'Gurudev Shri Rakeshbhai Jhaveri - Contemporary teacher making spirituality practical for modern living.',
    descriptionKey: 'gurus.rakeshbhai.description',
    tags: ['Modern', 'Practical', 'Daily Life', 'Balance'],
    icon: '🌱',
    isFeatured: false,
    color: '#84cc16',
  },
  {
    id: 'chinmayananda',
    route: '/hinduism/chinmayananda',
    agentName: 'hinduism-agent',
    name: 'Swami Chinmayananda',
    nameKey: 'gurus.chinmayananda.name',
    tradition: 'Hindu',
    tagline: 'Making Vedanta accessible',
    taglineKey: 'gurus.chinmayananda.tagline',
    description: 'Swami Chinmayananda - Founder of Chinmaya Mission, making Vedanta and Gita teachings accessible to all.',
    descriptionKey: 'gurus.chinmayananda.description',
    tags: ['Vedanta', 'Gita', 'Teaching', 'Knowledge'],
    icon: '📚',
    isFeatured: false,
    color: '#6366f1',
  },
  {
    id: 'mukundananda',
    route: '/hinduism/mukundananda',
    agentName: 'hinduism-agent',
    name: 'Swami Mukundananda',
    nameKey: 'gurus.mukundananda.name',
    tradition: 'Hindu',
    tagline: 'Bhakti Yoga and mind management',
    taglineKey: 'gurus.mukundananda.tagline',
    description: 'Swami Mukundananda - Modern teacher of Bhakti Yoga, combining devotion with practical wisdom.',
    descriptionKey: 'gurus.mukundananda.description',
    tags: ['Bhakti Yoga', 'JKYog', 'Mind', 'Devotion'],
    icon: '💝',
    isFeatured: false,
    color: '#a855f7',
  },
  {
    id: 'kripaluji',
    route: '/hinduism/kripaluji',
    agentName: 'hinduism-agent',
    name: 'Jagadguru Kripaluji',
    nameKey: 'gurus.kripaluji.name',
    tradition: 'Hindu',
    tagline: 'Radha-Krishna divine love',
    taglineKey: 'gurus.kripaluji.tagline',
    description: 'Jagadguru Kripaluji Maharaj - Master of Radha-Krishna devotion and divine love. "Radhe Radhe"',
    descriptionKey: 'gurus.kripaluji.description',
    tags: ['Radha-Krishna', 'Bhakti', 'Divine Love', 'Prema'],
    icon: '🌸',
    isFeatured: false,
    color: '#ec4899',
  },
  {
    id: 'prabhupada',
    route: '/hinduism/prabhupada',
    agentName: 'hinduism-agent',
    name: 'A.C. Bhaktivedanta Swami',
    nameKey: 'gurus.prabhupada.name',
    tradition: 'Hindu',
    tagline: 'Founder of ISKCON',
    taglineKey: 'gurus.prabhupada.tagline',
    description: 'Bhaktivedanta Swami Prabhupada - Spread Krishna consciousness worldwide. "Hare Krishna Hare Krishna"',
    descriptionKey: 'gurus.prabhupada.description',
    tags: ['Krishna Consciousness', 'ISKCON', 'Bhagavad Gita', 'Chanting'],
    icon: '🎵',
    isFeatured: false,
    color: '#fbbf24',
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
