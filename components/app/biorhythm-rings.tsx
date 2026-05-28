'use client';

import { motion } from 'motion/react';
import { Activity, Brain, Heart } from 'lucide-react';

interface BiorhythmData {
  physical: number;
  emotional: number;
  intellectual: number;
}

interface BiorhythmRingsProps {
  data: BiorhythmData | null;
  loading?: boolean;
}

export function BiorhythmRings({ data, loading = false }: BiorhythmRingsProps) {
  // SVG Circular progress constants
  const size = 180;
  const strokeWidth = 14;
  const center = size / 2;
  
  // Radiuses for the 3 rings
  const rPhysical = (size - strokeWidth * 2) / 2;
  const rEmotional = rPhysical - strokeWidth - 4;
  const rIntellectual = rEmotional - strokeWidth - 4;
  
  // Circumferences
  const cPhysical = 2 * Math.PI * rPhysical;
  const cEmotional = 2 * Math.PI * rEmotional;
  const cIntellectual = 2 * Math.PI * rIntellectual;

  // Normalize -100 to +100 range to 0 to 100 percentage
  const normalize = (val: any) => {
    if (!val && val !== 0) return 0;
    const v = typeof val === 'object' ? val.percent : val;
    return typeof v === 'number' ? Math.round((v + 100) / 2) : 0;
  };

  const pVal = loading || !data ? 0 : normalize(data.physical);
  const eVal = loading || !data ? 0 : normalize(data.emotional);
  const iVal = loading || !data ? 0 : normalize(data.intellectual);

  // Calculate stroke dash offsets
  const oPhysical = cPhysical - (pVal / 100) * cPhysical;
  const oEmotional = cEmotional - (eVal / 100) * cEmotional;
  const oIntellectual = cIntellectual - (iVal / 100) * cIntellectual;

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-6 shadow-xl flex flex-col items-center">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-orange-500" /> Your Energy Levels Today
      </h3>

      <div className="relative flex items-center justify-center">
        {/* SVG Rings */}
        <svg width={size} height={size} className="rotate-[-90deg]">
          <defs>
            <linearGradient id="gradPhysical" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="gradEmotional" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="gradIntellectual" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Rings */}
          <circle cx={center} cy={center} r={rPhysical} fill="transparent" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={strokeWidth} opacity="0.4" />
          <circle cx={center} cy={center} r={rEmotional} fill="transparent" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={strokeWidth} opacity="0.4" />
          <circle cx={center} cy={center} r={rIntellectual} fill="transparent" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={strokeWidth} opacity="0.4" />

          {/* Animated Foreground Rings */}
          <motion.circle
            cx={center} cy={center} r={rPhysical} fill="transparent"
            stroke="url(#gradPhysical)" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={cPhysical}
            initial={{ strokeDashoffset: cPhysical }}
            animate={{ strokeDashoffset: oPhysical }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
            filter="url(#glow)"
          />
          <motion.circle
            cx={center} cy={center} r={rEmotional} fill="transparent"
            stroke="url(#gradEmotional)" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={cEmotional}
            initial={{ strokeDashoffset: cEmotional }}
            animate={{ strokeDashoffset: oEmotional }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            filter="url(#glow)"
          />
          <motion.circle
            cx={center} cy={center} r={rIntellectual} fill="transparent"
            stroke="url(#gradIntellectual)" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={cIntellectual}
            initial={{ strokeDashoffset: cIntellectual }}
            animate={{ strokeDashoffset: oIntellectual }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
            filter="url(#glow)"
          />
        </svg>

        {/* Center Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 w-full space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
               <Activity className="w-4 h-4 text-orange-500" />
               <span className="font-bold text-slate-900 dark:text-white">Physical Body</span>
            </div>
            <span className="text-[10px] text-slate-400 ml-6">Stamina, strength, vitality</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{pVal}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
               <Heart className="w-4 h-4 text-pink-500" />
               <span className="font-bold text-slate-900 dark:text-white">Emotional State</span>
            </div>
            <span className="text-[10px] text-slate-400 ml-6">Mood, empathy, relationships</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{eVal}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
               <Brain className="w-4 h-4 text-cyan-500" />
               <span className="font-bold text-slate-900 dark:text-white">Mental Focus</span>
            </div>
            <span className="text-[10px] text-slate-400 ml-6">Logic, memory, creativity</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{iVal}%</span>
        </div>
      </div>
    </div>
  );
}
