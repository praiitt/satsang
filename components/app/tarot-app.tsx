'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { coinClient } from '@/lib/services/coinClient';
import { userService } from '@/lib/services/userService';
import { updateSpiritualState } from '@/lib/services/spiritual-state';

/* ─── Types ─────────────────────────────────────────────────── */
type Topic = 'love' | 'career' | 'finance' | 'general';
type ReadingType = 'spread' | 'yesno';

interface TarotCard {
  name: string;
  meaning: string;
  position: number;
  answer?: 'yes' | 'no' | 'unclear';
}

interface Reading {
  topic: string;
  cards: TarotCard[];
  type: ReadingType;
}

/* ─── Topic config ───────────────────────────────────────────── */
const TOPICS = [
  { id: 'love'    as Topic, emoji: '❤️', labelEn: 'Love & Relationships', labelHi: 'प्रेम और रिश्ते',   color: 'from-pink-600 to-rose-600',   glow: 'shadow-pink-500/40'   },
  { id: 'career'  as Topic, emoji: '⚡', labelEn: 'Career & Purpose',     labelHi: 'करियर और लक्ष्य',   color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/40'  },
  { id: 'finance' as Topic, emoji: '💰', labelEn: 'Finance & Abundance',  labelHi: 'धन और समृद्धि',     color: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/40'},
  { id: 'general' as Topic, emoji: '🔮', labelEn: 'General Guidance',     labelHi: 'सामान्य मार्गदर्शन', color: 'from-violet-600 to-indigo-600', glow: 'shadow-violet-500/40' },
];

/* ─── Auth-server URL ────────────────────────────────────────── */
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:4000';

/* ─── Main App ───────────────────────────────────────────────── */
export function TarotApp() {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<'welcome' | 'topics' | 'reading'>('welcome');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isAuthenticated, pathname, router]);

  if (authLoading || (!authLoading && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="border-amber-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent mx-auto"></div>
      </div>
    );
  }

  /* ── Fetch predictions from auth-server ── */
  async function fetchReading(topic: Topic) {
    setLoading(true);
    setError(null);
    setSelectedTopic(topic);
    setPhase('reading');
    setReading(null);

    try {
      // Map topic to coin feature ID
      let featureId = 'daily_tarot';
      if (topic === 'love') featureId = 'tarot_love';
      else if (topic === 'career') featureId = 'tarot_career';
      else if (topic === 'finance') featureId = 'tarot_finance';

      // Deduct coins before generating the reading
      const deductRes = await coinClient.deductCoins(featureId, { topic });
      if (!deductRes.success) {
        throw new Error(deductRes.error || 'Insufficient coins for Tarot Reading.');
      }

      const body = topic === 'general'
        ? { love: 1, career: 1, finance: 1 }
        : { [topic]: 1 };

      const res = await fetch('/api/tarot/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': language },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface meaningful errors
        const msg = data?.details || data?.error || `API error ${res.status}`;
        if (msg.includes('expired') || msg.includes('403')) {
          throw new Error('subscription_expired');
        }
        throw new Error(msg);
      }

      const cards: TarotCard[] = mapApiToCards(data, topic);
      const topicObj = TOPICS.find(t => t.id === topic)!;
      setReading({ topic: isHi ? topicObj.labelHi : topicObj.labelEn, cards, type: 'spread' });

      // Award Karma Points & Update Spiritual State
      if (user?.uid) {
         try {
             await userService.awardKarmaPoints(user.uid, 30, featureId);
             
             // Select the most prominent card (usually the first or last)
             const prominentCard = cards[0];
             
             // Map topic to an imbalance and remedy type for the Spiritual Studio cross-pollination
             let remedyType: 'Music' | 'Reel' | 'Art' = 'Music';
             let imbalanceStr = '';
             
             if (topic === 'love') {
               remedyType = 'Music';
               imbalanceStr = 'Emotional stagnation in Heart Chakra';
             } else if (topic === 'career') {
               remedyType = 'Reel';
               imbalanceStr = 'Root Chakra instability causing career fear';
             } else if (topic === 'finance') {
               remedyType = 'Art';
               imbalanceStr = 'Sacral Chakra block affecting abundance';
             } else {
               remedyType = 'Music';
               imbalanceStr = 'General energetic misalignment';
             }
             
             // Push the diagnosis to the user's global spiritual state
             await updateSpiritualState(user.uid, {
               currentImbalance: imbalanceStr,
               diagnosingTool: 'Tarot',
               activeRemedy: remedyType,
               satsangSummary: `The ${prominentCard.name} card indicates significant shifting energy. ${prominentCard.meaning.slice(0, 120)}...`
             });
             
         } catch (e) {
             console.warn('Failed to update karma or spiritual state:', e);
         }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'subscription_expired') {
        setError('subscription_expired');
      } else if (msg.includes('Insufficient coins')) {
        setError(msg);
      } else {
        setError('The cards are silent right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Map API response to card array ── */
  function mapApiToCards(data: Record<string, unknown>, topic: Topic): TarotCard[] {
    // astrologyapi.com returns plain strings: { love: "text...", career: "text...", finance: "text..." }
    const CARD_NAMES: Record<string, string[]> = {
      love:    ['The Lovers', 'The Empress', 'Two of Cups', 'The Star', 'Ace of Cups'],
      career:  ['The Chariot', 'The Magician', 'Ace of Wands', 'The Sun', 'Eight of Pentacles'],
      finance: ['The Wheel of Fortune', 'Ace of Pentacles', 'The Emperor', 'Six of Pentacles', 'The World'],
      general: ['The Fool', 'The High Priestess', 'The Moon', 'The Hermit', 'Judgement'],
    };

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const categories = topic === 'general'
      ? (['love', 'career', 'finance'] as const)
      : ([topic] as const);

    const cards: TarotCard[] = [];
    let pos = 0;

    for (const cat of categories) {
      const text = data[cat];
      if (typeof text === 'string' && text.trim()) {
        cards.push({
          name: pick(CARD_NAMES[cat] || CARD_NAMES.general),
          meaning: text.trim(),
          position: pos++,
        });
      }
    }

    return cards.slice(0, 3);
  }


  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-amber-50">
      {/* ── Ambient background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-700/10 blur-[120px]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-pink-700/10 blur-[100px]" />
        {/* Stars */}
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-amber-200/60 animate-pulse"
            style={{ top: `${(i * 17 + 7) % 100}%`, left: `${(i * 13 + 5) % 100}%`, animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══ WELCOME ══ */}
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl border border-purple-500/30 bg-black/30 shadow-[0_0_60px_rgba(168,85,247,0.5)] backdrop-blur-xl overflow-hidden"
            >
              <img src="/services/tarot-icon-fixed.png" alt="Tarot" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              <span className="absolute text-5xl">🔮</span>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="mb-3 bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-5xl font-bold text-transparent font-serif"
            >
              {isHi ? 'टैरो पाठक' : 'Mystic Tarot'}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="mb-10 max-w-md text-lg text-indigo-200/80"
            >
              {isHi
                ? 'ब्रह्मांड के रहस्य उजागर करें — प्रेम, करियर और जीवन के लिए व्यक्तिगत टैरो पठन'
                : 'Unveil the mysteries of your path — personalized readings for Love, Career & Life'}
            </motion.p>

            <motion.button
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => setPhase('topics')}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-purple-500/40 transition hover:shadow-purple-500/60"
            >
              {isHi ? '✨ कार्ड देखें' : '✨ Consult the Cards'}
            </motion.button>
          </motion.div>
        )}

        {/* ══ TOPIC PICKER ══ */}
        {phase === 'topics' && (
          <motion.div
            key="topics"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4"
          >
            <h2 className="mb-2 text-2xl font-bold text-amber-200">
              {isHi ? 'आप किस विषय में मार्गदर्शन चाहते हैं?' : 'What do you seek guidance on?'}
            </h2>
            <p className="mb-10 text-sm text-indigo-300/70">
              {isHi ? 'एक विषय चुनें और कार्ड अपनी कहानी कहेंगे' : 'Choose a topic and let the cards speak'}
            </p>

            <div className="grid w-full max-w-lg grid-cols-2 gap-4">
              {TOPICS.map((t, i) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => fetchReading(t.id)}
                  className={`flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br ${t.color} p-6 shadow-lg ${t.glow} shadow-md font-semibold text-white transition-all`}
                >
                  <span className="text-4xl">{t.emoji}</span>
                  <span className="text-sm text-center leading-tight">{isHi ? t.labelHi : t.labelEn}</span>
                </motion.button>
              ))}
            </div>

            <button onClick={() => setPhase('welcome')} className="mt-8 text-xs text-indigo-400 hover:text-indigo-200 transition">
              ← {isHi ? 'वापस जाएं' : 'Back'}
            </button>
          </motion.div>
        )}

        {/* ══ READING ══ */}
        {phase === 'reading' && (
          <motion.div
            key="reading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12"
          >
            {/* Topic label */}
            {selectedTopic && (
              <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-amber-500/60">
                {isHi ? 'पठन:' : 'Reading for:'} {TOPICS.find(t => t.id === selectedTopic)?.[isHi ? 'labelHi' : 'labelEn']}
              </div>
            )}

            {/* Loading — dealing animation */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="relative flex gap-3">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      initial={{ y: 0 }} animate={{ y: [-8, 8, -8] }}
                      transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.25, ease: 'easeInOut' }}
                      className="h-32 w-20 rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-purple-900 to-slate-900 shadow-lg flex items-center justify-center"
                    >
                      <span className="text-2xl text-amber-400">✨</span>
                    </motion.div>
                  ))}
                </div>
                <p className="text-indigo-300 animate-pulse">{isHi ? 'कार्ड प्रकट हो रहे हैं…' : 'The cards are revealing themselves…'}</p>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm">
                {error === 'subscription_expired' ? (
                  <>
                    <div className="mb-4 text-5xl">🔑</div>
                    <h3 className="mb-2 text-lg font-bold text-amber-300">
                      {isHi ? 'API सदस्यता समाप्त' : 'API Subscription Expired'}
                    </h3>
                    <p className="mb-4 text-sm text-indigo-300">
                      {isHi
                        ? 'ज्योतिष API की सदस्यता समाप्त हो गई है। कृपया astrologyapi.com पर अपनी योजना नवीनीकृत करें।'
                        : 'The AstrologyAPI subscription has expired. Please renew the plan at astrologyapi.com dashboard.'}
                    </p>
                    <a
                      href="https://astrologyapi.com/dashboard" target="_blank" rel="noopener noreferrer"
                      className="inline-block rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-black hover:bg-amber-400 transition"
                    >
                      {isHi ? 'योजना नवीनीकृत करें' : 'Renew Plan →'}
                    </a>
                  </>
                ) : (
                  <>
                    <div className="mb-4 text-4xl">🌙</div>
                    <p className="mb-6 text-indigo-300">{error}</p>
                    <button onClick={() => setPhase('topics')} className="rounded-xl bg-purple-700 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-600 transition">
                      {isHi ? 'पुनः प्रयास करें' : 'Try Again'}
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* Cards */}
            {reading && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Card spread */}
                <div className="flex flex-wrap justify-center gap-6">
                  {reading.cards.map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -60, opacity: 0, rotateY: 90 }}
                      animate={{ y: 0, opacity: 1, rotateY: 0 }}
                      transition={{ delay: i * 0.5, duration: 0.8, type: 'spring' }}
                      className="w-56 rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-purple-900/80 to-indigo-900/80">
                        <span className="text-6xl">🎴</span>
                      </div>
                      {/* Card name */}
                      <div className="border-b border-amber-500/20 bg-black/30 px-4 py-2 text-center">
                        <h3 className="font-serif font-bold text-amber-200">{card.name}</h3>
                        <p className="text-[10px] uppercase tracking-widest text-indigo-400">
                          {['Past', 'Present', 'Future'][i] ?? `Card ${i + 1}`}
                        </p>
                      </div>
                      {/* Meaning */}
                      <div className="p-4 text-xs italic leading-relaxed text-amber-100/70 text-center">
                        "{card.meaning.slice(0, 180)}{card.meaning.length > 180 ? '…' : ''}"
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }}
                  className="mt-10 flex flex-wrap justify-center gap-4"
                >
                  <button
                    onClick={() => { setReading(null); setPhase('topics'); }}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:scale-105 transition"
                  >
                    🔮 {isHi ? 'नया पठन करें' : 'New Reading'}
                  </button>
                  <button
                    onClick={() => selectedTopic && fetchReading(selectedTopic)}
                    className="rounded-xl border border-amber-500/30 bg-black/30 px-6 py-2.5 text-sm font-semibold text-amber-300 hover:bg-black/50 transition"
                  >
                    ↺ {isHi ? 'पुनः खींचें' : 'Redraw'}
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* Back button */}
            {!loading && (
              <button onClick={() => setPhase('topics')} className="mt-8 text-xs text-indigo-400 hover:text-indigo-200 transition">
                ← {isHi ? 'वापस जाएं' : 'Back'}
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
