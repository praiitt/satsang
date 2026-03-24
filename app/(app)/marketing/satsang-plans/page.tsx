'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Calendar, 
  ChevronRight, 
  Search, 
  Sparkles, 
  User, 
  X,
  Languages,
  ScrollText
} from 'lucide-react';
import { ALL_GURUS } from '@/lib/gurus';
import { Button } from '@/components/livekit/button';

interface SatsangPlan {
  id: string;
  topic: string;
  guruId: string;
  intro_text: string;
  pravachan_points: string[];
  closing_text: string;
  createdAt: string;
  language?: string;
}

const API_BASE = '/api/marketing/satsang-plans';

export default function SatsangPlansPage() {
  const [plans, setPlans] = useState<SatsangPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SatsangPlan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}?limit=100`);
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans || []);
      } else {
        setError(data.error || 'Failed to load satsang plans');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to marketing server');
    } finally {
      setLoading(false);
    }
  };

  const getGuruName = (guruId: string) => {
    const guru = ALL_GURUS.find(g => g.id === guruId);
    return guru?.name || guruId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredPlans = plans.filter(plan => 
    plan.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getGuruName(plan.guruId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2c2c] dark:bg-[#0f1115] dark:text-[#e0e0e0]">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-transparent py-16 dark:from-orange-950/10">
        <div className="container mx-auto max-w-6xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-[#1a1a1a] dark:text-white">
              Satsang <span className="text-orange-600 bg-clip-text">Discourses</span>
            </h1>
            <p className="max-w-2xl text-xl text-gray-600 dark:text-gray-400">
              Explore the timeless wisdom of spiritual masters distilled into structured, 
              profound sessions for your daily journey.
            </p>
          </motion.div>

          {/* Search Bar */}
          <div className="mt-10 relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics or gurus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 shadow-sm outline-none ring-orange-500 transition-all focus:ring-2 dark:border-gray-800 dark:bg-gray-900"
            />
          </div>
        </div>
        
        {/* Background elements */}
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/20 blur-3xl dark:bg-orange-800/10" />
      </div>

      <div className="container mx-auto max-w-6xl px-6 pb-24">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="h-10 w-10 rounded-full border-4 border-orange-100 border-t-orange-600"
            />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
            <p className="mb-4 text-lg font-semibold">{error}</p>
            <Button onClick={loadPlans}>🔄 Try Again</Button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="py-24 text-center">
            <ScrollText className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700" />
            <h3 className="text-xl font-semibold">No discourses found</h3>
            <p className="text-gray-500">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPlan(plan)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/20">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      {plan.language === 'en' ? 'English' : 'Hindi'}
                    </div>
                  </div>

                  <h3 className="mb-2 text-xl font-bold line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {plan.topic}
                  </h3>
                  
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="font-medium text-orange-500/80">{getGuruName(plan.guruId)}</span>
                  </div>

                  <p className="mb-6 line-clamp-3 text-sm text-gray-500 dark:text-gray-500">
                    {plan.intro_text}
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-4 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(plan.createdAt)}
                    </div>
                    <div className="flex items-center text-sm font-semibold text-orange-600">
                      Read More <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Reading Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md dark:bg-black/60 sm:p-8"
            onClick={() => setSelectedPlan(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="relative h-full max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#14161a]"
            >
              {/* Modal Header */}
              <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-gray-50 bg-white/80 p-6 backdrop-blur-md dark:border-gray-800 dark:bg-[#14161a]/80">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/20">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold line-clamp-1">{selectedPlan.topic}</h2>
                    <p className="text-sm text-orange-500/80">{getGuruName(selectedPlan.guruId)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content - Reading View */}
              <div className="h-full overflow-y-auto px-8 pb-16 pt-28 sm:px-12">
                <div className="mx-auto max-w-2xl space-y-12">
                  {/* Intro Section */}
                  <div className="relative pt-8">
                    <div className="absolute -left-6 top-6 text-6xl text-orange-100 dark:text-orange-900/10">"</div>
                    <p className="text-2xl font-serif italic leading-relaxed text-gray-700 dark:text-gray-300">
                      {selectedPlan.intro_text}
                    </p>
                  </div>

                  {/* Body Paragraphs */}
                  <div className="space-y-10 border-t border-gray-50 pt-12 dark:border-gray-800">
                    {selectedPlan.pravachan_points.map((paragraph, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="relative"
                      >
                        <span className="absolute -left-12 top-2 text-xs font-mono text-gray-200 dark:text-gray-800">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="text-lg leading-loose text-gray-600 dark:text-gray-400">
                          {paragraph}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Closing Section */}
                  <div className="mt-16 rounded-3xl bg-orange-50/50 p-10 text-center dark:bg-orange-950/20">
                    <Sparkles className="mx-auto mb-6 h-8 w-8 text-orange-600/40" />
                    <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
                      {selectedPlan.closing_text}
                    </p>
                    <div className="mt-6 text-sm font-semibold tracking-widest text-orange-600 uppercase">
                      Om Shanti
                    </div>
                  </div>
                  
                  {/* Footer Meta */}
                  <div className="flex flex-col items-center gap-6 border-t border-gray-50 pt-12 pb-12 dark:border-gray-800">
                    <div className="flex items-center gap-8 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        {selectedPlan.language === 'hi' ? 'Hindi' : 'English'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedPlan.createdAt)}
                      </div>
                    </div>
                    <Button 
                      onClick={() => setSelectedPlan(null)}
                      variant="outline"
                      className="rounded-full px-8"
                    >
                      Back to Gallery
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
