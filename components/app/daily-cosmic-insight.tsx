'use client';

import { motion } from 'motion/react';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';

interface DailyCosmicInsightProps {
  nakshatraData: any;
  panchangData: any;
  loading?: boolean;
}

export function DailyCosmicInsight({ nakshatraData, panchangData, loading = false }: DailyCosmicInsightProps) {
  // Safe extraction with fallbacks to support both mock and real API structures
  const nData = nakshatraData?.daily_nakshatra_prediction || nakshatraData || {};
  const predictionObj = nData.prediction || {};
  const prediction = typeof predictionObj === 'string' 
    ? predictionObj 
    : (predictionObj.luck || predictionObj.personal_life || predictionObj.health || "The cosmic energies are aligning. Check back soon for your daily insight.");
    
  const luckyColor = nData.lucky_color || "Blue"; // Fallback to generic if API doesn't provide
  const luckyNumber = nData.lucky_number || "7";
  
  const pData = panchangData || {};
  const tithi = pData.tithi?.details?.tithi_name || "N/A";
  const nakshatra = pData.nakshatra?.details?.nak_name || "N/A";
  
  const rahuKaalObj = pData.rahukaal || pData.rahu_kaal || {};
  const rahuKaalStart = rahuKaalObj.start || "--:--";
  const rahuKaalEnd = rahuKaalObj.end || "--:--";
  
  const abhijitObj = pData.abhijit_muhurta || {};
  const abhijitStart = abhijitObj.start || "--:--";
  const abhijitEnd = abhijitObj.end || "--:--";

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
      {/* Decorative background flair */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />

      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" /> Your Daily Cosmic Vibe
      </h3>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[120px]">
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col flex-1"
        >
          {/* Main Prediction */}
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic mb-4 flex-1">
            "{prediction}"
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
            <span className="flex items-center gap-1">🎨 Lucky Color: <span className="text-slate-800 dark:text-slate-200">{luckyColor}</span></span>
            <span className="flex items-center gap-1">🎲 Lucky Number: <span className="text-slate-800 dark:text-slate-200">{luckyNumber}</span></span>
          </div>

          <hr className="border-slate-200 dark:border-slate-800 mb-4" />

          {/* Panchang Timings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/50">
               <h4 className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                 <Clock className="w-3 h-3" /> Power Window
               </h4>
               <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 leading-tight">Best for important meetings or starting new tasks.</p>
               <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{abhijitStart} - {abhijitEnd}</p>
            </div>
            
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-3 border border-rose-100 dark:border-rose-900/50">
               <h4 className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                 <AlertTriangle className="w-3 h-3" /> Pause & Reflect
               </h4>
               <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 leading-tight">Avoid big financial or life decisions during this block.</p>
               <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{rahuKaalStart} - {rahuKaalEnd}</p>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Lunar Phase: {tithi} • Moon Position: {nakshatra}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
