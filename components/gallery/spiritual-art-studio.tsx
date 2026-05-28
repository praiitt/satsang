'use client';

import { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, RefreshCw, Download, Wand2, ChevronRight, Palette, ArrowLeft } from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { useLanguage } from '@/contexts/language-context';

interface SpiritualArtStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onShowBuyCoins?: () => void;
}

const INTENTIONS = [
  { id: 'ganesh', label: 'Lord Ganesha', emoji: '🐘', hint: 'Remover of obstacles, new beginnings' },
  { id: 'durga', label: 'Goddess Durga', emoji: '🔱', hint: 'Divine feminine, protection, strength' },
  { id: 'cosmic', label: 'Cosmic Universe', emoji: '🌌', hint: 'Stars, galaxies, infinite creation' },
  { id: 'lotus', label: 'Sacred Lotus', emoji: '🪷', hint: 'Purity, enlightenment, rising above' },
  { id: 'shiva', label: 'Lord Shiva', emoji: '🌙', hint: 'Transformation, meditation, moksha' },
  { id: 'chakra', label: 'Chakra Energy', emoji: '✨', hint: 'Seven chakras, energy flow, healing' },
];

type Step = 'choose' | 'enhance' | 'result';

export function SpiritualArtStudio({ isOpen, onClose, onShowBuyCoins }: SpiritualArtStudioProps) {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const [step, setStep] = useState<Step>('choose');
  const [selectedIntention, setSelectedIntention] = useState('');
  const [customIntention, setCustomIntention] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const getToken = (): Promise<string> => new Promise((resolve, reject) => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      auth.currentUser.getIdToken().then(resolve).catch(reject);
      return;
    }
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      if (user) user.getIdToken().then(resolve).catch(reject);
      else reject(new Error("Please log in to generate art"));
    });
    setTimeout(() => { unsub(); reject(new Error("Auth timed out. Please refresh.")); }, 5000);
  });

  const handleEnhance = async () => {
    const finalIntention = customIntention.trim() || selectedIntention;
    if (!finalIntention) { setError('Please select or write an intention.'); return; }

    setIsEnhancing(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/art/generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ intention: finalIntention })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Enhancement failed');
      const data = await res.json();
      setEnhancedPrompt(data.enhancedPrompt);
      setStep('enhance');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    const finalIntention = customIntention.trim() || selectedIntention;
    setIsGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/art/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ intention: finalIntention, enhancedPrompt })
      });
      if (res.status === 402) { if (onShowBuyCoins) onShowBuyCoins(); throw new Error('Not enough coins.'); }
      if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
      const data = await res.json();
      setImageDataUrl(data.imageDataUrl);
      setStep('result');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setStep('choose');
    setSelectedIntention('');
    setCustomIntention('');
    setEnhancedPrompt('');
    setImageDataUrl(null);
    setError(null);
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `spiritual-art-${Date.now()}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[92vh] bg-gradient-to-br from-[#0d0d1a] to-[#1a0d2e] rounded-3xl shadow-2xl border border-purple-500/20 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {step !== 'choose' && (
              <button onClick={() => setStep(step === 'result' ? 'enhance' : 'choose')}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Palette className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Art Director</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Imagen 4</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5">
          {['choose', 'enhance', 'result'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-purple-500 text-white' :
                ['choose', 'enhance', 'result'].indexOf(step) > i ? 'bg-purple-500/40 text-purple-300' :
                'bg-white/10 text-gray-500'
              }`}>{i + 1}</div>
              <span className={`text-xs font-medium ${step === s ? 'text-purple-300' : 'text-gray-600'}`}>
                {s === 'choose' ? 'Intention' : s === 'enhance' ? 'Enhance' : 'Create'}
              </span>
              {i < 2 && <ChevronRight className="w-3 h-3 text-gray-700" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1: Choose Intention */}
          {step === 'choose' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{isHi ? 'आप क्या प्रकट करना चाहते हैं?' : 'What do you want to manifest?'}</h3>
                <p className="text-gray-400">{isHi ? 'एक विषय चुनें या अपना खुद का वर्णन करें। हमारा AI एक दिव्य दृश्य तैयार करेगा।' : 'Choose a theme or describe your own. Our AI will craft a divine vision.'}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {INTENTIONS.map(intent => (
                  <button key={intent.id}
                    onClick={() => { setSelectedIntention(intent.label); setCustomIntention(''); }}
                    className={`p-4 rounded-2xl border text-left transition-all group hover:scale-[1.02] ${
                      selectedIntention === intent.label && !customIntention
                        ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/20'
                        : 'border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-purple-500/5'
                    }`}>
                    <span className="text-2xl block mb-2">{intent.emoji}</span>
                    <p className="font-semibold text-white text-sm">{intent.label}</p>
                    <p className="text-gray-500 text-xs mt-1 leading-tight">{intent.hint}</p>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">{isHi ? 'या अपने दृष्टिकोण का वर्णन करें:' : 'Or describe your own vision:'}</label>
                <textarea
                  value={customIntention}
                  onChange={(e) => { setCustomIntention(e.target.value); setSelectedIntention(''); }}
                  placeholder={isHi ? 'उदा. सुनहरे घंटे में हिमालय के आधार पर ध्यान कर रहा एक साधु...' : 'e.g., A meditating sage at the base of the Himalayas at golden hour...'}
                  className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                />
              </div>

              {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

              <button
                onClick={handleEnhance}
                disabled={isEnhancing || (!selectedIntention && !customIntention.trim())}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                  isEnhancing || (!selectedIntention && !customIntention.trim())
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:scale-[1.02]'
                }`}>
                {isEnhancing ? <><RefreshCw className="w-5 h-5 animate-spin" /> {isHi ? 'आपकी दृष्टि को संवर्धित किया जा रहा है...' : 'Enhancing your vision...'}</>
                  : <><Wand2 className="w-5 h-5" /> {isHi ? 'कला निर्देशक से पूछें ✨' : 'Ask Art Director ✨'}</>}
              </button>
            </div>
          )}

          {/* STEP 2: Review Enhanced Prompt */}
          {step === 'enhance' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{isHi ? 'आपकी दृष्टि, संवर्धित' : 'Your Vision, Enhanced'}</h3>
                <p className="text-gray-400">{isHi ? 'AI ने आपके इरादे को एक समृद्ध कलात्मक प्रॉम्प्ट में विस्तारित किया है। यदि आप चाहें तो संपादित करें, फिर उत्पन्न करें।' : 'The AI has expanded your intention into a rich artistic prompt. Edit if you\'d like, then generate.'}</p>
              </div>

              <div className="mb-6 p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5">
                <p className="text-xs text-purple-400 font-semibold mb-2 uppercase tracking-wider">{isHi ? 'आपका मूल इरादा' : 'Your original intention'}</p>
                <p className="text-gray-300 italic">"{customIntention.trim() || selectedIntention}"</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> {isHi ? 'AI संवर्धित प्रॉम्प्ट' : 'AI Enhanced Prompt'} <span className="text-gray-500 font-normal">({isHi ? 'आप इसे संपादित कर सकते हैं' : 'you can edit this'})</span>
                </label>
                <textarea
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-purple-500/20 bg-white/5 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none leading-relaxed"
                  rows={8}
                />
              </div>

              <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                {isHi ? 'Google Imagen 4 द्वारा संचालित · बीटा के दौरान मुफ्त' : 'Powered by Google Imagen 4 · Free during beta'}
              </div>

              {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep('choose')}
                  className="flex-1 py-4 rounded-2xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 transition-all">
                  {isHi ? 'पीछे' : 'Back'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !enhancedPrompt.trim()}
                  className={`flex-2 flex-grow py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isGenerating
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:scale-[1.02]'
                  }`}>
                  {isGenerating
                    ? <><RefreshCw className="w-5 h-5 animate-spin" /> {isHi ? 'आपकी कला बन रही है...' : 'Creating your art...'}</>
                    : <><ImageIcon className="w-5 h-5" /> {isHi ? 'Imagen 4 से बनाएँ (30 🪙)' : 'Generate with Imagen 4 (30 🪙)'}</>}
                </button>
              </div>
            </div>
          )}
          {/* STEP 3: Result */}
          {step === 'result' && imageDataUrl && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">{isHi ? 'आपकी दिव्य रचना ✨' : 'Your Divine Creation ✨'}</h3>
                <p className="text-gray-500 text-sm">"{customIntention.trim() || selectedIntention}"</p>
              </div>

              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-purple-500/20 mb-6 mx-auto max-w-sm">
                <img src={imageDataUrl} alt="Generated spiritual art" className="w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={handleDownload}
                  className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-2 transition-all border border-white/10">
                  <Download className="w-4 h-4" /> {isHi ? 'डाउनलोड करें' : 'Download'}
                </button>
                <button onClick={handleReset}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-4 h-4" /> {isHi ? 'एक और बनाएँ' : 'Create Another'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
