'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLanguage } from '@/contexts/language-context';
import { getFirebaseFirestore, getFirebaseAuth } from '@/lib/firebase-client';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { PartnerOnboardingModal } from './partner-onboarding-modal';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface ReportCard {
  id: string;
  icon: string;
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  coins: number;
  endpoint: string;
  isPDF: boolean;
  pdfType?: string;
  pages?: number;
  requiresPartner?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   Report Catalogue
───────────────────────────────────────────────────────────── */
const TEXT_REPORTS: ReportCard[] = [
  {
    id: 'nakshatra',
    icon: '⭐',
    titleHi: 'नक्षत्र रिपोर्ट',
    titleEn: 'Nakshatra Report',
    descHi: 'आपके जन्म नक्षत्र का गहरा विश्लेषण',
    descEn: 'Deep analysis of your birth nakshatra and its influence',
    coins: 10,
    endpoint: 'nakshatra',
    isPDF: false,
  },
  {
    id: 'ascendant',
    icon: '🔭',
    titleHi: 'लग्न रिपोर्ट',
    titleEn: 'Ascendant Report',
    descHi: 'आपके लग्न का विस्तृत अध्ययन',
    descEn: 'Detailed study of your ascendant (Lagna) and rising sign',
    coins: 10,
    endpoint: 'ascendant',
    isPDF: false,
  },
  {
    id: 'lalkitab',
    icon: '📕',
    titleHi: 'लाल किताब',
    titleEn: 'Lal Kitab',
    descHi: 'लाल किताब के अनुसार उपाय और भविष्यवाणी',
    descEn: 'Predictions and remedies as per the Lal Kitab tradition',
    coins: 20,
    endpoint: 'lalkitab',
    isPDF: false,
  },
  {
    id: 'numerology',
    icon: '🔢',
    titleHi: 'अंक ज्योतिष',
    titleEn: 'Numerology Report',
    descHi: 'अंकों के रहस्य से जानें अपना भाग्य',
    descEn: 'Decode the numbers governing your life and fortune',
    coins: 15,
    endpoint: 'numerology',
    isPDF: false,
  },
  {
    id: 'pitra-dosha',
    icon: '🪔',
    titleHi: 'पितृ दोष रिपोर्ट',
    titleEn: 'Pitra Dosha Report',
    descHi: 'पितृ दोष की जांच और उपाय',
    descEn: 'Analysis of ancestral karma and remedies',
    coins: 15,
    endpoint: 'pitra-dosha',
    isPDF: false,
  },
  {
    id: 'sadhesati',
    icon: '🪐',
    titleHi: 'साढ़े साती',
    titleEn: 'Sadhe Sati Report',
    descHi: 'शनि की साढ़े साती का प्रभाव और उपाय',
    descEn: "Saturn's 7.5-year transit — impact and remedies",
    coins: 25,
    endpoint: 'sadhesati',
    isPDF: false,
  },
  {
    id: 'partner',
    icon: '💑',
    titleHi: 'पार्टनर रिपोर्ट',
    titleEn: 'Partner Report',
    descHi: 'जीवनसाथी के बारे में ज्योतिषीय जानकारी',
    descEn: 'Astrological insights about your life partner',
    coins: 20,
    endpoint: 'partner',
    isPDF: false,
  },
  {
    id: 'match-making',
    icon: '❤️',
    titleHi: 'कुंडली मिलान',
    titleEn: 'Match Making Report',
    descHi: 'दो कुंडलियों का विस्तृत मिलान',
    descEn: 'Detailed compatibility analysis of two horoscopes',
    coins: 30,
    endpoint: 'match-making',
    isPDF: false,
    requiresPartner: true,
  },
];

const PDF_REPORTS: ReportCard[] = [
  {
    id: 'mini-horoscope',
    icon: '📜',
    titleHi: 'मिनी कुंडली PDF',
    titleEn: 'Mini Horoscope PDF',
    descHi: '9 पृष्ठों की कुंडली रिपोर्ट',
    descEn: 'Concise 9-page personalised horoscope report',
    coins: 25,
    endpoint: 'pdf/mini-horoscope',
    isPDF: true,
    pdfType: 'mini',
    pages: 9,
  },
  {
    id: 'basic-horoscope',
    icon: '📔',
    titleHi: 'बेसिक कुंडली PDF',
    titleEn: 'Basic Horoscope PDF',
    descHi: '25 पृष्ठों की विस्तृत कुंडली रिपोर्ट',
    descEn: 'Detailed 25-page horoscope with full analysis',
    coins: 50,
    endpoint: 'pdf/basic-horoscope',
    isPDF: true,
    pdfType: 'basic',
    pages: 25,
  },
  {
    id: 'professional-horoscope',
    icon: '🏆',
    titleHi: 'प्रोफेशनल कुंडली PDF',
    titleEn: 'Professional Horoscope PDF',
    descHi: '68 पृष्ठों की सम्पूर्ण ज्योतिष रिपोर्ट',
    descEn: 'Comprehensive 68-page in-depth astrological report',
    coins: 100,
    endpoint: 'pdf/professional-horoscope',
    isPDF: true,
    pdfType: 'professional',
    pages: 68,
  },
  {
    id: 'match-making-pdf',
    icon: '💍',
    titleHi: 'मैचमेकिंग PDF',
    titleEn: 'Match Making PDF',
    descHi: '24 पृष्ठों की कुंडली मिलान रिपोर्ट',
    descEn: '24-page comprehensive compatibility PDF report',
    coins: 75,
    endpoint: 'pdf/match-making',
    isPDF: true,
    pdfType: 'matchmaking',
    pages: 24,
    requiresPartner: true,
  },
];

/* ─────────────────────────────────────────────────────────────
   Single report card
───────────────────────────────────────────────────────────── */
function ReportCardItem({
  report,
  language,
  onGenerate,
  loading,
  cachedPdfUrl,
  hasPartnerData,
}: {
  report: ReportCard;
  language: string;
  onGenerate: (report: ReportCard) => void;
  loading: boolean;
  cachedPdfUrl?: string | null;
  hasPartnerData?: boolean;
}) {
  const isHi = language === 'hi';
  const isDownloaded = report.isPDF && !!cachedPdfUrl;
  const needsPartnerDetails = report.requiresPartner && !hasPartnerData;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-orange-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all hover:border-orange-400 hover:shadow-xl dark:border-orange-900/60 dark:bg-slate-900/70"
    >
      {/* Glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-100/0 to-amber-100/0 opacity-0 transition-opacity duration-300 group-hover:from-orange-100/40 group-hover:to-amber-100/20 group-hover:opacity-100 dark:group-hover:from-orange-900/20 dark:group-hover:to-amber-900/10" />

      <div className="relative z-10 flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 text-2xl shadow-sm dark:from-orange-900/50 dark:to-amber-900/30">
          {report.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {isHi ? report.titleHi : report.titleEn}
            </h3>
            <div className="flex items-center gap-1.5">
              {isDownloaded && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ✓ Ready
                </span>
              )}
              {report.isPDF && report.pages && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {report.pages} pages
                </span>
              )}
              {!isDownloaded && (
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  🪙 {report.coins}
                </span>
              )}
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isHi ? report.descHi : report.descEn}
          </p>

          {report.requiresPartner && (
            <p className="mt-1.5 text-[10px] italic text-amber-600 dark:text-amber-400">
              ⚠️ Requires partner details
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onGenerate(report)}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow transition-all hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
                isDownloaded
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600'
                  : needsPartnerDetails
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 dark:from-pink-600 dark:to-rose-600'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600'
              }`}
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isDownloaded ? 'Opening…' : 'Generating…'}
                </>
              ) : needsPartnerDetails ? (
                <>💑 {isHi ? 'पार्टनर विवरण जोड़ें' : 'Add Partner Details'}</>
              ) : isDownloaded ? (
                <>📄 {isHi ? 'PDF देखें' : 'View PDF'}</>
              ) : report.isPDF ? (
                <>📥 {isHi ? 'PDF बनाएं' : 'Generate PDF'}</>
              ) : (
                <>✨ {isHi ? 'रिपोर्ट देखें' : 'View Report'}</>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = '/business/creators/music/studio';
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 shadow-sm transition-all hover:scale-105 hover:bg-purple-100 hover:shadow-md dark:border-purple-800/50 dark:bg-purple-900/20 dark:text-purple-300"
              title="Manifest music from this reading"
            >
              🎵 {isHi ? 'संगीत बनाएं' : 'Theme Song'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section icon map
───────────────────────────────────────────────────────────── */
const SECTION_ICONS: Record<string, string> = {
  physical: '🧘',
  character: '🌟',
  family: '👨‍👩‍👧',
  education: '📚',
  health: '💊',
  finance: '💰',
  career: '🏢',
  love: '❤️',
  luck: '🍀',
  general: '🔮',
  description: '📜',
  prediction: '🔭',
  result: '✨',
};

function getSectionIcon(key: string) {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return '📖';
}

/* ─────────────────────────────────────────────────────────────
   Recursive Report Renderer
───────────────────────────────────────────────────────────── */
function RecursiveReportRenderer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-slate-400 italic">N/A</span>;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return (
      <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
        {String(data)}
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-400 italic">Empty</span>;

    // Check if it's an array of objects
    if (typeof data[0] === 'object' && data[0] !== null) {
      return (
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          {data.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-orange-200/50 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-orange-900/40 dark:bg-slate-800/80"
            >
              <RecursiveReportRenderer data={item} depth={depth + 1} />
            </div>
          ))}
        </div>
      );
    }

    // Array of strings/numbers
    return (
      <ul className="mt-2 space-y-2">
        {data.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <span className="mt-0.5 text-[10px] text-orange-500">◆</span>
            <span>{String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Object
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    return (
      <div className={`space-y-4 ${depth > 0 ? 'mt-2' : ''}`}>
        {entries.map(([key, value]) => {
          // Format key: camelCase or snake_case to Title Case
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, (str) => str.toUpperCase());

          // Primitive values
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            const isLongString = typeof value === 'string' && value.length > 60;
            return (
              <div
                key={key}
                className={`flex ${
                  isLongString ? 'flex-col gap-1.5' : 'flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2'
                }`}
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                  {formattedKey}:
                </span>
                <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {String(value)}
                </span>
              </div>
            );
          }

          // Complex values (Nested Object or Array)
          return (
            <div key={key} className="pt-2">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-[10px] text-orange-400">▶</span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{formattedKey}</h4>
              </div>
              <div className="pl-4 border-l-2 border-orange-100 dark:border-orange-900/50">
                <RecursiveReportRenderer data={value} depth={depth + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────
   Report Result Modal
───────────────────────────────────────────────────────────── */
function ReportModal({
  title,
  data,
  onClose,
  onRefresh,
  fromCache,
}: {
  title: string;
  data: Record<string, unknown>;
  onClose: () => void;
  onRefresh: () => void;
  fromCache: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-orange-200/60 bg-white shadow-2xl dark:border-orange-800/40 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 dark:border-orange-900/40 dark:from-slate-800 dark:to-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            {fromCache && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">📦 Loaded from cache</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              title="Refresh report"
              className="rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 shadow-sm transition hover:bg-orange-50 dark:border-orange-800 dark:bg-slate-800 dark:text-orange-400 dark:hover:bg-slate-700"
            >
              🔄 Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          {typeof data === 'object' && data !== null ? (
            <div className="space-y-6">
              {Object.entries(data).map(([key, val]) => (
                <div key={key} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="mb-3 flex items-center gap-2 border-b border-orange-100 pb-2 dark:border-orange-900/30">
                    <span className="text-xl">{getSectionIcon(key)}</span>
                    <h3 className="text-base font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      {key.replace(/_/g, ' ')}
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-5 shadow-sm dark:border-orange-900/40 dark:from-slate-800/50 dark:to-slate-900/50">
                    <RecursiveReportRenderer data={val} depth={1} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <RecursiveReportRenderer data={data} depth={0} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main View
───────────────────────────────────────────────────────────── */
export function VedicReportsView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; data: Record<string, unknown>; fromCache: boolean } | null>(null);
  const [refreshTarget, setRefreshTarget] = useState<ReportCard | null>(null);
  const [pdfModal, setPdfModal] = useState<{ title: string; url: string } | null>(null);
  const [pdfCache, setPdfCache] = useState<Record<string, string>>({});
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [pendingReport, setPendingReport] = useState<ReportCard | null>(null);

  // Pre-load cached PDF URLs and partner data
  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      const db = getFirebaseFirestore();
      
      // Load user doc for partner data
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && userSnap.data()?.partnerData) {
          setPartnerData(userSnap.data()?.partnerData);
        }
      } catch (err) {
        console.error('Error fetching partner data:', err);
      }

      // Load cache
      const cache: Record<string, string> = {};
      await Promise.all(
        PDF_REPORTS.map(async (r) => {
          const pdfType = r.id.replace(/-/g, '_');
          try {
            const snap = await getDoc(doc(db, 'users', user.uid, 'reportCache', `pdf_${pdfType}`));
            if (snap.exists() && snap.data()?.pdfUrl) {
              cache[r.id] = snap.data().pdfUrl as string;
            }
          } catch {}
        })
      );
      setPdfCache(cache);
    };
    load();
  }, [user?.uid]);

  const getBirthDataForUser = async () => {
    if (!user?.uid) return null;
    try {
      const db = getFirebaseFirestore();

      // Try the users doc first
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const bd = data.birthData; // birth data is nested!
        
        if (bd && bd.birthDate && bd.birthTime && bd.latitude !== undefined && bd.longitude !== undefined) {
          return {
            name: bd.name || data.name || data.displayName || 'User',
            gender: bd.gender || 'male',
            birthDate: bd.birthDate,      // YYYY-MM-DD
            birthTime: bd.birthTime,      // HH:MM
            latitude: bd.latitude,
            longitude: bd.longitude,
            timezone: bd.timezone ?? 5.5,
            place: bd.placeOfBirth || bd.place || '',
          };
        }
      }

      return null;
    } catch (err) {
      console.error('[VedicReportsView] Failed to fetch birth data:', err);
      return null;
    }
  };

  const getCachedReport = async (reportId: string) => {
    if (!user?.uid) return null;
    try {
      const db = getFirebaseFirestore();
      const cacheRef = doc(db, 'users', user.uid, 'reportCache', reportId);
      const snap = await getDoc(cacheRef);
      if (snap.exists()) return snap.data() as Record<string, unknown>;
    } catch {}
    return null;
  };

  const saveReportCache = async (reportId: string, data: Record<string, unknown>) => {
    if (!user?.uid) return;
    try {
      const db = getFirebaseFirestore();
      const cacheRef = doc(db, 'users', user.uid, 'reportCache', reportId);
      await setDoc(cacheRef, { ...data, _cachedAt: new Date().toISOString() });
    } catch {}
  };

  const handleGenerate = async (report: ReportCard, forceRefresh = false) => {
    if (!user) {
      setErrorMsg('Please log in to generate reports.');
      return;
    }

    // --- Cached PDF: open modal instantly, no API call ---
    if (report.isPDF && !forceRefresh && pdfCache[report.id]) {
      setPdfModal({ title: isHi ? report.titleHi : report.titleEn, url: pdfCache[report.id] });
      return;
    }

    // --- Require Partner Details ---
    if (report.requiresPartner && !partnerData) {
      setPendingReport(report);
      setShowPartnerModal(true);
      return;
    }

    setLoadingId(report.id);
    setErrorMsg(null);

    try {
      // --- Check cache first for text reports (unless refreshing) ---
      if (!forceRefresh && !report.isPDF) {
        const cached = await getCachedReport(report.id);
        if (cached) {
          const { _cachedAt, ...reportData } = cached;
          setModal({ title: isHi ? report.titleHi : report.titleEn, data: reportData, fromCache: true });
          setRefreshTarget(report);
          setLoadingId(null);
          return;
        }
      }

      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const birthData = await getBirthDataForUser();

      if (!birthData) {
        setErrorMsg('Birth data not found. Please complete onboarding first.');
        setLoadingId(null);
        return;
      }

      let payload: any = { language };
      if (report.endpoint.includes('match-making')) {
        // Construct matchmaking payload
        const userGender = birthData.gender || 'male';
        const partnerGender = partnerData?.gender || 'female';
        
        // Match user to maleData/femaleData based on their gender
        if (userGender === 'male') {
          payload.maleData = birthData;
          payload.femaleData = partnerData || birthData; // Fallback to birthData if somehow missing
        } else if (userGender === 'female') {
          payload.femaleData = birthData;
          payload.maleData = partnerData || birthData;
        } else {
          // Default same-sex mapping or unknown
          payload.maleData = birthData;
          payload.femaleData = partnerData || birthData;
        }
      } else {
        // Standard report payload
        payload.birthData = birthData;
      }

      const res = await fetch(`/api/reports/${report.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 402) {
          setErrorMsg(`Insufficient coins. You need 🪙 ${report.coins} coins for this report.`);
        } else {
          setErrorMsg(json.error || 'Failed to generate report. Please try again.');
        }
        return;
      }

      if (report.isPDF) {
        const pdfUrl = json.data?.pdfUrl || json.data?.downloadLink;
        if (pdfUrl) {
          setPdfCache(prev => ({ ...prev, [report.id]: pdfUrl }));
          setPdfModal({ title: isHi ? report.titleHi : report.titleEn, url: pdfUrl });
        } else {
          setErrorMsg('PDF URL not received. Please try again.');
        }
      } else {
        await saveReportCache(report.id, json.data);
        setModal({ title: isHi ? report.titleHi : report.titleEn, data: json.data, fromCache: false });
        setRefreshTarget(report);
      }
    } catch (err) {
      console.error('[VedicReportsView] Error:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-slate-950 dark:via-orange-950 dark:to-red-950">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827z' fill='%23f97316'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="text-5xl">📚</div>
          <h1 className="mt-3 text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 bg-clip-text text-transparent dark:from-orange-400 dark:via-red-400 dark:to-amber-400 md:text-4xl">
            {isHi ? 'मेरी रिपोर्ट्स' : 'My Astrology Reports'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {isHi
              ? 'अपनी कुंडली के आधार पर विस्तृत रिपोर्ट प्राप्त करें'
              : 'Generate detailed reports based on your Vedic chart'}
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              <span className="text-lg">⚠️</span>
              <span>{errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Reports Section */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-orange-800 dark:text-orange-300">
            ✨ {isHi ? 'ज्योतिष रिपोर्ट्स' : 'Astrology Text Reports'}
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-normal text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
              {isHi ? 'तुरंत उपलब्ध' : 'Instant'}
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEXT_REPORTS.map((report, i) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ReportCardItem
                  report={report}
                  language={language}
                  onGenerate={handleGenerate}
                  loading={loadingId === report.id}
                  hasPartnerData={!!partnerData}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* PDF Reports Section */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-orange-800 dark:text-orange-300">
            📥 {isHi ? 'PDF रिपोर्ट्स' : 'PDF Horoscope Reports'}
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              {isHi ? 'डाउनलोड' : 'Download'}
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PDF_REPORTS.map((report, i) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 + 0.2 }}>
                <ReportCardItem
                  report={report}
                  language={language}
                  onGenerate={handleGenerate}
                  loading={loadingId === report.id}
                  cachedPdfUrl={pdfCache[report.id] ?? null}
                  hasPartnerData={!!partnerData}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Back link */}
        <div className="mt-10 text-center">
          <a
            href="/vedic-jyotish"
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white/60 px-5 py-2.5 text-sm font-medium text-orange-700 shadow-sm transition-all hover:bg-orange-50 hover:shadow-md dark:border-orange-900 dark:bg-slate-900/60 dark:text-orange-300 dark:hover:bg-orange-900/20"
          >
            ← {isHi ? 'वापस जाएं' : 'Back to Jyotish'}
          </a>
        </div>
      </div>

      {/* Report text modal */}
      <AnimatePresence>
        {modal && (
          <ReportModal
            title={modal.title}
            data={modal.data}
            fromCache={modal.fromCache}
            onClose={() => setModal(null)}
            onRefresh={() => {
              setModal(null);
              if (refreshTarget) handleGenerate(refreshTarget, true);
            }}
          />
        )}
      </AnimatePresence>

      {/* PDF viewer modal */}
      <AnimatePresence>
        {pdfModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
          >
            {/* Prominent top bar */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900/95 px-4 py-3 shadow-lg">
              {/* Title */}
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xl">📄</span>
                <h2 className="truncate font-bold text-white">{pdfModal.title}</h2>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Discuss with Jyotish */}
                <a
                  href={`/vedic-jyotish?pdfUrl=${encodeURIComponent(pdfModal.url)}&pdfTitle=${encodeURIComponent(pdfModal.title)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 hover:shadow-orange-500/50"
                >
                  ✨ {isHi ? 'ज्योतिष से चर्चा करें' : 'Discuss with Jyotish'}
                </a>

                {/* Download */}
                <a
                  href={pdfModal.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  ⬇️ {isHi ? 'डाउनलोड' : 'Download'}
                </a>

                {/* Close — big and obvious */}
                <button
                  onClick={() => setPdfModal(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/80 text-white shadow transition hover:scale-105 hover:bg-red-500"
                  title="Close"
                >
                  <span className="text-base font-bold">✕</span>
                </button>
              </div>
            </div>

            {/* PDF iframe — full remaining height */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfModal.url}
                title={pdfModal.title}
                className="h-full w-full border-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partner Onboarding Modal */}
      <AnimatePresence>
        {showPartnerModal && (
          <PartnerOnboardingModal
            onCancel={() => {
              setShowPartnerModal(false);
              setPendingReport(null);
            }}
            onComplete={(newPartnerData) => {
              setPartnerData(newPartnerData);
              setShowPartnerModal(false);
              if (pendingReport) {
                // Short timeout to allow modal animation to clear
                setTimeout(() => {
                  handleGenerate(pendingReport);
                  setPendingReport(null);
                }, 300);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
