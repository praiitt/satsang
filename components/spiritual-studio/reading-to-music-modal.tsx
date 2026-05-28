'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Star, Moon, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/livekit/button';

interface ReadingToMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReadingToMusicModal({ isOpen, onClose, onSuccess }: ReadingToMusicModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'astrology' | 'tarot' | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!selectedType) {
      setError('Please select a reading type first.');
      return;
    }
    
    if (!user?.uid) {
      setError('You must be logged in to generate music.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/spiritual-studio/generate-from-reading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          readingType: selectedType,
          userId: user.uid,
          language: 'en'
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate track');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl"
        >
          {/* Header */}
          <div className="relative border-b border-slate-800 bg-slate-900/50 p-6 text-center">
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Manifest from Reading</h2>
            <p className="text-sm text-slate-400">
              Transform your cosmic or mystic readings into personalized spiritual music.
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Astrology Card */}
              <button
                type="button"
                onClick={() => setSelectedType('astrology')}
                disabled={loading}
                className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                  selectedType === 'astrology'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Star className={`h-8 w-8 mb-2 ${selectedType === 'astrology' ? 'text-amber-500' : 'text-slate-400'}`} />
                <h3 className={`font-semibold ${selectedType === 'astrology' ? 'text-amber-500' : 'text-slate-200'}`}>Astrology</h3>
                <p className="text-xs text-slate-500 mt-1 text-center">Based on your Kundli</p>
              </button>

              {/* Tarot Card */}
              <button
                type="button"
                onClick={() => setSelectedType('tarot')}
                disabled={loading}
                className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                  selectedType === 'tarot'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Moon className={`h-8 w-8 mb-2 ${selectedType === 'tarot' ? 'text-purple-500' : 'text-slate-400'}`} />
                <h3 className={`font-semibold ${selectedType === 'tarot' ? 'text-purple-500' : 'text-slate-200'}`}>Tarot</h3>
                <p className="text-xs text-slate-500 mt-1 text-center">Based on recent reading</p>
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={loading || !selectedType}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none shadow-lg py-4 text-lg h-14"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Reading...
                </>
              ) : (
                'Manifest Track'
              )}
            </Button>
            
            <p className="text-center text-xs text-slate-500 mt-4">
              Our AI will analyze the deep spiritual themes of your reading to compose a track specifically for you.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
