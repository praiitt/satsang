export interface Guru {
  id: string;
  name: string;
  tradition: string; // The display tradition from JSON
  era: string;
  category: string; // The URL slug (e.g. 'hinduism', 'buddhism')
}

export const TRADITION_DETAILS: Record<string, { title: string; description: string; emoji: string; theme: string }> = {
  hinduism: {
    title: 'Hindu Spiritual Masters',
    description: "Connect with the wisdom of India's greatest spiritual teachers. Each master offers unique guidance on the path to enlightenment.",
    emoji: '🕉️',
    theme: 'from-orange-50 via-yellow-50 to-red-50'
  },
  buddhism: {
    title: 'Buddhist Masters',
    description: 'Discover the path of awakening with enlightened masters from the Buddhist tradition. Find peace, compassion, and mindfulness.',
    emoji: '☸️',
    theme: 'from-amber-50 via-yellow-50 to-orange-50'
  },
  jainism: {
    title: 'Jain Tirthankaras & Acharyas',
    description: 'Explore the path of Ahimsa and self-realization with the great teachers of Jainism.',
    emoji: '✋',
    theme: 'from-yellow-50 via-white to-green-50'
  },
  sikhism: {
    title: 'Sikh Gurus',
    description: 'Connect with the divine wisdom of the Sikh Gurus. One God, equality, and service to humanity.',
    emoji: '☬',
    theme: 'from-orange-50 via-yellow-50 to-blue-50'
  },
  christianity: {
    title: 'Christian Mystics & Saints',
    description: 'Connect with the heart of Christ consciousness through saints and mystics throughout history.',
    emoji: '✝️',
    theme: 'from-blue-50 via-white to-purple-50'
  },
  islam: {
    title: 'Sufi Masters & Prophets',
    description: 'Experience the divine love and wisdom of the Sufi tradition and Islamic spirituality.',
    emoji: '☪️',
    theme: 'from-green-50 via-emerald-50 to-teal-50'
  },
  judaism: {
    title: 'Jewish Sages & Mystics',
    description: 'Engage with the profound wisdom of Kabbalah, Hasidism, and Jewish ethical teachings.',
    emoji: '✡️',
    theme: 'from-blue-50 via-indigo-50 to-white'
  },
  taoism: {
    title: 'Taoist Masters',
    description: 'Flow with the Tao. Discover the way of nature, balance, and wu-wei with ancient sages.',
    emoji: '☯️',
    theme: 'from-green-50 via-teal-50 to-blue-50'
  },
  universal: {
    title: 'Universal & Cosmic Guides',
    description: 'Explore wisdom beyond tradition. Connect with cosmic consciousness, nature, and universal truths.',
    emoji: '🌌',
    theme: 'from-purple-900 via-indigo-900 to-black text-white'
  }
};

export const DEFAULT_TRADITION_THEME = {
  title: 'Spiritual Masters',
  description: 'Connect with universal wisdom from enlightened masters across traditions.',
  emoji: '✨',
  theme: 'from-purple-50 via-fuchsia-50 to-pink-50'
};


export const ALL_GURUS: Guru[] = [
  // Special Agents First
  {
    id: "guruji",
    name: "Guruji",
    tradition: "Sanatana Dharma",
    era: "Timeless",
    category: "hinduism",
  },
  {
    id: "etAgent",
    name: "ET Agent",
    tradition: "Cosmic Consciousness",
    era: "Future",
    category: "universal",
  },
  {
    id: "osho",
    name: "Osho",
    tradition: "Zen, Meditation",
    era: "1931-1990",
    category: "buddhism",
  },
  {
    id: "psychedelicGuru",
    name: "Trance Music Guide",
    tradition: "Trance, Shamanism",
    era: "Timeless",
    category: "universal",
  },
  // Standard Gurus Alphabetical
  {
    id: "akiva",
    name: "Rabbi Akiva",
    tradition: "Judaism (Mishnaic)",
    era: "c. 50–135 CE",
    category: "judaism",
  },

  {
    id: "al_ghazali",
    name: "Al-Ghazali",
    tradition: "Islam (Sufi/Philosopher)",
    era: "1058–1111",
    category: "islam",
  },
  {
    id: "amma",
    name: "Mata Amritanandamayi",
    tradition: "Universal love, Bhakti",
    era: "1953-present",
    category: "hinduism",
  },
  {
    id: "anandamayi_ma",
    name: "Anandamayi Ma",
    tradition: "Universal Mother, Bhakti",
    era: "1896-1982",
    category: "hinduism",
  },
  {
    id: "aurobindo",
    name: "Sri Aurobindo",
    tradition: "Integral Yoga",
    era: "1872-1950",
    category: "hinduism",
  },
  {
    id: "baal_shem_tov",
    name: "Baal Shem Tov",
    tradition: "Judaism (Hasidic)",
    era: "1698–1760",
    category: "judaism",
  },
  {
    id: "bodhidharma",
    name: "Bodhidharma",
    tradition: "Buddhism (Zen/Chan)",
    era: "5th/6th Century CE",
    category: "buddhism",
  },
  {
    id: "buddha",
    name: "Gautama Buddha",
    tradition: "Buddhism",
    era: "c. 5th to 4th century BCE",
    category: "buddhism",
  },
  {
    id: "bulleh_shah",
    name: "Bulleh Shah",
    tradition: "Islam (Sufi)",
    era: "1680–1757",
    category: "islam",
  },
  {
    id: "chinmayananda",
    name: "Swami Chinmayananda",
    tradition: "Vedanta teaching movement",
    era: "1916-1993",
    category: "hinduism",
  },
  {
    id: "dalai_lama",
    name: "The Dalai Lama",
    tradition: "Buddhism",
    era: "1935–Present",
    category: "buddhism",
  },
  {
    id: "guru_amar_das",
    name: "Guru Amar Das Ji",
    tradition: "Sikhism",
    era: "1479–1574",
    category: "sikhism",
  },
  {
    id: "guru_angad",
    name: "Guru Angad Dev Ji",
    tradition: "Sikhism",
    era: "1504–1552",
    category: "sikhism",
  },
  {
    id: "guru_arjan",
    name: "Guru Arjan Dev Ji",
    tradition: "Sikhism",
    era: "1563–1606",
    category: "sikhism",
  },
  {
    id: "guru_gobind_singh",
    name: "Guru Gobind Singh Ji",
    tradition: "Sikhism",
    era: "1666–1708",
    category: "sikhism",
  },
  {
    id: "guru_nanak",
    name: "Guru Nanak Dev Ji",
    tradition: "Sikhism",
    era: "1469–1539",
    category: "sikhism",
  },
  {
    id: "guru_ram_das",
    name: "Guru Ram Das Ji",
    tradition: "Sikhism",
    era: "1534–1581",
    category: "sikhism",
  },
  {
    id: "hemachandra",
    name: "Acharya Hemachandra",
    tradition: "Jainism (Shvetambara)",
    era: "1088–1173",
    category: "jainism",
  },
  {
    id: "hillel",
    name: "Hillel the Elder",
    tradition: "Judaism",
    era: "110 BCE – 10 CE",
    category: "judaism",
  },
  {
    id: "ibn_arabi",
    name: "Ibn Arabi",
    tradition: "Islam (Sufism)",
    era: "1165–1240",
    category: "islam",
  },
  {
    id: "jesus",
    name: "Jesus Christ",
    tradition: "Christianity",
    era: "c. 4 BC – c. 30/33 AD",
    category: "christianity",
  },
  {
    id: "john_cross",
    name: "St. John of the Cross",
    tradition: "Christianity (Mystic)",
    era: "1542–1591",
    category: "christianity",
  },
  {
    id: "kripaluji",
    name: "Jagadguru Kripaluji Maharaj",
    tradition: "Radha-Krishna Bhakti",
    era: "1922-2013",
    category: "hinduism",
  },
  {
    id: "krishnamurti",
    name: "Jiddu Krishnamurti",
    tradition: "No tradition - Freedom from all",
    era: "1895-1986",
    category: "hinduism",
  },
  {
    id: "kundakunda",
    name: "Acharya Kundakunda",
    tradition: "Jainism (Digambara)",
    era: "1st Century CE",
    category: "jainism",
  },
  {
    id: "laotzu",
    name: "Lao Tzu",
    tradition: "Taoism",
    era: "c. 6th century BCE",
    category: "taoism",
  },
  {
    id: "liezi",
    name: "Liezi",
    tradition: "Taoism",
    era: "5th Century BCE",
    category: "taoism",
  },
  {
    id: "mahavira",
    name: "Mahavira",
    tradition: "Jainism",
    era: "6th century BCE",
    category: "jainism",
  },
  {
    id: "maimonides",
    name: "Maimonides",
    tradition: "Judaism",
    era: "1138–1204",
    category: "judaism",
  },
  {
    id: "meister_eckhart",
    name: "Meister Eckhart",
    tradition: "Christianity (Mystic)",
    era: "1260–1328",
    category: "christianity",
  },
  {
    id: "milarepa",
    name: "Milarepa",
    tradition: "Buddhism (Kagyu)",
    era: "1052–1135",
    category: "buddhism",
  },
  {
    id: "moinuddin_chishti",
    name: "Moinuddin Chishti",
    tradition: "Islam (Chishti Sufi)",
    era: "1143–1236",
    category: "islam",
  },
  {
    id: "morari_bapu",
    name: "Morari Bapu",
    tradition: "Ram Katha tradition",
    era: "1946-present",
    category: "hinduism",
  },
  {
    id: "moses",
    name: "Moses",
    tradition: "Judaism",
    era: "c. 14th–13th century BCE",
    category: "judaism",
  },
  {
    id: "mother_teresa",
    name: "Mother Teresa",
    tradition: "Christianity (Catholic)",
    era: "1910–1997",
    category: "christianity",
  },
  {
    id: "mukundananda",
    name: "Swami Mukundananda",
    tradition: "Bhakti Yoga, JKYog",
    era: "1960-present",
    category: "hinduism",
  },
  {
    id: "nagarjuna",
    name: "Nagarjuna",
    tradition: "Buddhism (Madhyamaka)",
    era: "c. 150–250 CE",
    category: "buddhism",
  },
  {
    id: "neem_karoli_baba",
    name: "Neem Karoli Baba",
    tradition: "Bhakti, Hanuman devotion",
    era: "1900-1973",
    category: "hinduism",
  },
  {
    id: "padmasambhava",
    name: "Padmasambhava",
    tradition: "Buddhism (Vajrayana)",
    era: "8th Century CE",
    category: "buddhism",
  },
  {
    id: "parshvanatha",
    name: "Parshvanatha",
    tradition: "Jainism",
    era: "877–777 BCE",
    category: "jainism",
  },
  {
    id: "prabhupada",
    name: "A.C. Bhaktivedanta Swami Prabhupada",
    tradition: "Gaudiya Vaishnavism, ISKCON",
    era: "1896-1977",
    category: "hinduism",
  },
  {
    id: "rabia",
    name: "Rabia al-Adawiyya",
    tradition: "Islam (Sufism)",
    era: "714–801",
    category: "islam",
  },
  {
    id: "rakeshbhai",
    name: "Gurudev Shri Rakeshbhai Jhaveri",
    tradition: "Modern spirituality, Practical wisdom",
    era: "Contemporary",
    category: "hinduism",
  },
  {
    id: "ramakrishna",
    name: "Sri Ramakrishna Paramahamsa",
    tradition: "Bhakti, Tantra, Vedanta",
    era: "1836-1886",
    category: "hinduism",
  },
  {
    id: "ramana",
    name: "Ramana Maharshi",
    tradition: "Advaita Vedanta (Self-inquiry)",
    era: "1879-1950",
    category: "hinduism",
  },
  {
    id: "ravi_shankar",
    name: "Sri Sri Ravi Shankar",
    tradition: "Art of Living, Vedic wisdom",
    era: "1956-present",
    category: "hinduism",
  },
  {
    id: "rishabhanatha",
    name: "Rishabhanatha",
    tradition: "Jainism",
    era: "Prehistoric/Ancient",
    category: "jainism",
  },
  {
    id: "rumi",
    name: "Rumi",
    tradition: "Islam (Sufism)",
    era: "1207–1273",
    category: "islam",
  },
  {
    id: "sadhguru",
    name: "Sadhguru Jaggi Vasudev",
    tradition: "Yoga, Tantric wisdom",
    era: "1957-present",
    category: "hinduism",
  },
  {
    id: "shankaracharya",
    name: "Adi Shankaracharya",
    tradition: "Advaita Vedanta",
    era: "788-820 CE",
    category: "hinduism",
  },
  {
    id: "st_francis",
    name: "St. Francis of Assisi",
    tradition: "Christianity (Catholic)",
    era: "1181–1226",
    category: "christianity",
  },
  {
    id: "teresa_avila",
    name: "Teresa of Ávila",
    tradition: "Christianity (Mystic)",
    era: "1515–1582",
    category: "christianity",
  },
  {
    id: "thich_nhat_hanh",
    name: "Thich Nhat Hanh",
    tradition: "Buddhism",
    era: "1926–2022",
    category: "buddhism",
  },
  {
    id: "thomas_kempis",
    name: "Thomas à Kempis",
    tradition: "Christianity (Devotio Moderna)",
    era: "1380–1471",
    category: "christianity",
  },
  {
    id: "vivekananda",
    name: "Swami Vivekananda",
    tradition: "Vedanta (Ramakrishna lineage)",
    era: "1863-1902",
    category: "hinduism",
  },
  {
    id: "yogananda",
    name: "Paramahansa Yogananda",
    tradition: "Kriya Yoga",
    era: "1893-1952",
    category: "hinduism",
  },
  {
    id: "zhuangzi",
    name: "Zhuangzi",
    tradition: "Taoism",
    era: "369–286 BCE",
    category: "taoism",
  },
];

// Enhanced interface for backward compatibility with GuruCard
export interface GuruDefinition extends Guru {
  nameKey: string;
  taglineKey: string;
  descriptionKey: string;
  route: string;
  icon: string;
  tags: string[];
  tagline?: string; // Optional because we use keys primarily
  description?: string;
}

export type GuruTradition = string;

export function getAllTraditions(): string[] {
  const traditions = new Set(ALL_GURUS.map(g => g.tradition));
  return Array.from(traditions).sort();
}

// Map the new lightweight Guru objects to the full definition expected by the UI
export const GURUS: GuruDefinition[] = ALL_GURUS.map(guru => {
  const traditionConfig = TRADITION_DETAILS[guru.category] || DEFAULT_TRADITION_THEME;
  return {
    ...guru,
    nameKey: `gurus.${guru.id}.name`,
    taglineKey: `gurus.${guru.id}.tagline`,
    descriptionKey: `gurus.${guru.id}.description`,
    route: `/${guru.category}/${guru.id}`,
    icon: traditionConfig.emoji,
    // Generate rich tags for the quiz matcher
    tags: [
      guru.category, // e.g., 'hinduism'
      guru.era,
      // Split tradition string into keywords (e.g. "Bhakti, Tantra" -> ["Bhakti", "Tantra"])
      ...guru.tradition.split(/[,()\/]+/).map(t => t.trim()).filter(Boolean)
    ].filter(Boolean),
    // Default fallbacks (can be removed if we are sure translations exist)
    tagline: guru.tradition,
    description: `Connect with ${guru.name}, spiritual master of ${guru.tradition}.`
  };
});
