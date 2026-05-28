'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Video, Play, Pause, RefreshCw, PlusCircle, LayoutTemplate, Share2, Wand2 } from 'lucide-react';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { PromptWizardModal } from '../spiritual-studio/prompt-wizard-modal';
import { useLanguage } from '@/contexts/language-context';

interface SpiritualReelsStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onShowBuyCoins?: () => void;
  initialPrompt?: string;
}

const INTENTIONS = [
  { id: 'peace', label: 'Inner Peace', emoji: '🕊️' },
  { id: 'abundance', label: 'Abundance', emoji: '✨' },
  { id: 'healing', label: 'Healing', emoji: '🌿' },
  { id: 'strength', label: 'Inner Strength', emoji: '🦁' },
  { id: 'gratitude', label: 'Gratitude', emoji: '🙏' },
  { id: 'love', label: 'Unconditional Love', emoji: '❤️' },
];

export function SpiritualReelsStudio({ isOpen, onClose, onShowBuyCoins, initialPrompt = '' }: SpiritualReelsStudioProps) {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const [selectedIntention, setSelectedIntention] = useState<string>('');
  const [customIntention, setCustomIntention] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReelId, setCurrentReelId] = useState<string | null>(null);
  const [reelData, setReelData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Update custom intention if initialPrompt changes
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setCustomIntention(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Poll Firestore for reel updates
  useEffect(() => {
    if (!currentReelId) return;

    const db = getFirebaseFirestore();
    const unsub = onSnapshot(doc(db, 'spiritual_reels', currentReelId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setReelData(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setIsGenerating(false);
        }
      }
    });

    return () => unsub();
  }, [currentReelId]);

  const handleGenerate = async () => {
    const finalIntention = customIntention.trim() || selectedIntention;
    if (!finalIntention) {
      setError('Please select or write an intention.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setReelData(null);

    try {
      const auth = getFirebaseAuth();

      // Wait for auth to be ready - handles race condition where currentUser is null briefly
      const getToken = (): Promise<string> => new Promise((resolve, reject) => {
        if (auth.currentUser) {
          auth.currentUser.getIdToken().then(resolve).catch(reject);
          return;
        }
        // Wait up to 5 seconds for auth to initialize
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            user.getIdToken().then(resolve).catch(reject);
          } else {
            reject(new Error("Please log in to generate reels"));
          }
        });
        setTimeout(() => {
          unsubscribe();
          reject(new Error("Auth timed out. Please refresh and try again."));
        }, 5000);
      });

      const token = await getToken();

      const res = await fetch('/api/reels/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ intention: finalIntention })
      });

      if (res.status === 402) {
        if (onShowBuyCoins) onShowBuyCoins();
        throw new Error('Not enough coins. Generating a reel costs 120 🪙.');
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate reel');
      }

      const data = await res.json();
      setCurrentReelId(data.reelId);

    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Creation Controls */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-y-auto border-r border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Video className="w-6 h-6 text-amber-500" />
              Reels Studio
            </h2>
            <button 
              onClick={onClose}
              className="md:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 mb-8 border border-amber-100 dark:border-amber-500/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {isHi ? 'AI का उपयोग करके एक सुंदर 15s का आध्यात्मिक रील बनाएँ। इंस्टाग्राम शॉर्ट्स या व्हाट्सएप स्टेटस के लिए बिल्कुल सही।' : 'Create a beautiful 15s Spiritual Reel using AI. Perfect for Instagram Shorts or WhatsApp Status.'}
              <br/><br/>
              <strong>{isHi ? 'लागत:' : 'Cost:'}</strong> 120 🪙
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{isHi ? '1. अपना इरादा चुनें' : '1. Choose your Intention'}</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {INTENTIONS.map(intent => (
              <button
                key={intent.id}
                onClick={() => { setSelectedIntention(intent.label); setCustomIntention(''); }}
                className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-medium transition-all ${
                  selectedIntention === intent.label && !customIntention
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-500/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{intent.emoji}</span>
                {intent.label}
              </button>
            ))}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {isHi ? 'या एक कस्टम इरादा लिखें:' : 'Or write a custom intention:'}
            </label>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium hover:text-amber-700 dark:hover:text-amber-300 transition-colors bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {isHi ? 'रील्स निर्देशक से पूछें ✨' : 'Ask Reels Director ✨'}
            </button>
          </div>
          <div className="mb-8">
            <textarea
              value={customIntention}
              onChange={(e) => setCustomIntention(e.target.value)}
              placeholder={isHi ? 'उदा. मेरे परिवार के स्वास्थ्य के लिए एक प्रार्थना...' : 'e.g., A prayer for my family\'s health...'}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              rows={2}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="mt-auto">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || (!selectedIntention && !customIntention.trim())}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isGenerating 
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black shadow-lg shadow-amber-500/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {isHi ? 'उत्पन्न किया जा रहा है...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {isHi ? 'रील बनाएँ (120 🪙)' : 'Generate Reel (120 🪙)'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Preview */}
        <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-950 p-6 flex flex-col items-center justify-center relative min-h-[400px]">
          <button 
            onClick={onClose}
            className="hidden md:flex absolute top-6 right-6 p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white z-10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!reelData ? (
            <div className="text-center">
              <LayoutTemplate className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{isHi ? 'आपकी रील यहाँ दिखाई देगी' : 'Your Reel will appear here'}</p>
            </div>
          ) : (
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black border border-gray-800">
              
              {/* CSS "Video" Effect via Image Panning */}
              {reelData.imageUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center animate-ken-burns"
                  style={{ backgroundImage: `url(${reelData.imageUrl})` }}
                />
              )}

              {/* Status Overlay */}
              {reelData.status !== 'completed' && reelData.status !== 'failed' && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4" />
                  <p className="text-white font-medium mb-2">
                    {reelData.status === 'generating_script' && 'Writing Affirmation...'}
                    {reelData.status === 'generating_image' && 'Painting Divine Scene...'}
                    {reelData.status === 'generating_audio' && 'Recording Voice...'}
                    {reelData.status === 'generating' && 'Starting Magic...'}
                  </p>
                </div>
              )}

              {/* Error Overlay */}
              {reelData.status === 'failed' && (
                <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center p-6 text-center">
                  <p className="text-white font-bold">Failed to generate reel. Coins will be refunded.</p>
                </div>
              )}

              {/* Completed Reel Player Overlay */}
              {reelData.status === 'completed' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  
                  {reelData.audioUrl && (
                    <audio 
                      ref={audioRef} 
                      src={reelData.audioUrl} 
                      onEnded={() => setIsPlaying(false)} 
                      autoPlay
                    />
                  )}

                  <div className="absolute inset-0 flex items-center justify-center">
                    {!isPlaying && (
                      <button 
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all border border-white/30"
                      >
                        <Play className="w-6 h-6 text-white ml-1" />
                      </button>
                    )}
                  </div>

                  {/* Karaoke-style Text */}
                  <div className="absolute bottom-16 left-0 right-0 p-6 text-center pointer-events-none">
                    <p className="text-white font-bold text-lg md:text-xl drop-shadow-md leading-snug">
                      {reelData.script}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Post-Creation Actions */}
          {reelData?.status === 'completed' && (
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  if (reelData?.audioUrl) {
                    window.open(reelData.audioUrl, '_blank');
                  }
                }}
                className="px-6 py-3 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm shadow-md flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Download Audio
              </button>
            </div>
          )}
        </div>
      </div>
      
      <PromptWizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        mode="reels"
        initialInput={customIntention.trim() || selectedIntention}
        onStartCall={handleGenerate}
      />
    </div>
  );
}
