'use client';

import { motion } from 'motion/react';
import { Sun, Moon, Zap, MessageCircle, Gem, Heart, Shield } from 'lucide-react';

interface HoraEntry {
  time: string; // e.g., "12:25 : 13:25"
  hora: string; // e.g., "Sun", "Venus"
}

interface HoraTimelineProps {
  data: any;
  loading?: boolean;
}

const PLANET_CONFIG: Record<string, { icon: any, color: string, bg: string, label: string, desc: string }> = {
  Sun: { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-900/50', label: 'Vitality & Leadership', desc: 'Best for big decisions and authority matters.' },
  Moon: { icon: Moon, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-800', label: 'Intuition & Calm', desc: 'Favorable for emotional matters and reflection.' },
  Mars: { icon: Zap, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/50', label: 'Action & Energy', desc: 'Ideal for physical exertion and bold moves.' },
  Mercury: { icon: MessageCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50', label: 'Communication', desc: 'Good for studying, tech, and negotiation.' },
  Jupiter: { icon: Gem, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-600/10 border-yellow-200 dark:border-yellow-900/50', label: 'Wisdom & Expansion', desc: 'Auspicious for finances and major purchases.' },
  Venus: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-900/50', label: 'Love & Art', desc: 'Perfect for socializing, romance, and creativity.' },
  Saturn: { icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/50', label: 'Focus & Discipline', desc: 'Suited for deep work and organizing.' },
};

export function HoraTimeline({ data, loading = false }: HoraTimelineProps) {
  if (loading) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-6 shadow-xl h-[200px] flex items-center justify-center">
        <div className="flex gap-2">
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    );
  }

  // Extract combined list of day and night horas
  const dayHoras: HoraEntry[] = data?.hora?.day || [];
  const nightHoras: HoraEntry[] = data?.hora?.night || [];
  let allHoras = [...dayHoras, ...nightHoras];

  if (allHoras.length === 0) {
    return null; // Don't render if no data
  }

  // Find the current active hour
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMinute;

  let activeIndex = -1;
  let hasPassedCurrent = false;

  const timelineHoras = allHoras.map((h, i) => {
    // time format is "06:00 : 07:00" or "6:00 : 7:00"
    const parts = h.time.split(' : ');
    let startMins = 0;
    let endMins = 0;
    
    if (parts.length === 2) {
      const [sh, sm] = parts[0].split(':').map(Number);
      const [eh, em] = parts[1].split(':').map(Number);
      startMins = sh * 60 + sm;
      endMins = eh * 60 + em;
      
      // Handle overnight wrap around (e.g., 23:25 to 0:25)
      if (endMins < startMins) endMins += 24 * 60;
      let checkCurrent = currentTotalMins;
      if (checkCurrent < startMins && startMins > 12 * 60 && endMins > 24 * 60) {
        checkCurrent += 24 * 60;
      }

      if (checkCurrent >= startMins && checkCurrent < endMins) {
        activeIndex = i;
        hasPassedCurrent = true;
      }
    }
    
    return {
      ...h,
      isActive: activeIndex === i,
      isPast: !hasPassedCurrent && activeIndex === -1
    };
  });

  // Filter to show from active onwards, plus a few past ones
  const startIndex = Math.max(0, activeIndex !== -1 ? activeIndex - 1 : 0);
  const displayHoras = timelineHoras.slice(startIndex, startIndex + 8);

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-6 shadow-xl w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Your Hourly Power Guide
        </h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
          Cosmic Rhythms
        </span>
      </div>

      <div className="overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex gap-4 min-w-max">
          {displayHoras.map((h, i) => {
            const config = PLANET_CONFIG[h.hora] || PLANET_CONFIG.Sun;
            const Icon = config.icon;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className={`relative w-[220px] rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
                  h.isActive 
                    ? `bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20` 
                    : h.isPast
                      ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                      : `${config.bg}`
                }`}
              >
                {h.isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-lg whitespace-nowrap z-10">
                    Current Hour
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${h.isPast ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {h.time}
                  </span>
                  <div className={`p-1.5 rounded-full ${h.isPast ? 'bg-slate-200 dark:bg-slate-700' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
                    <Icon className={`w-4 h-4 ${h.isPast ? 'text-slate-400' : config.color}`} />
                  </div>
                </div>
                
                <div>
                  <h4 className={`text-sm font-bold flex items-center gap-1.5 ${h.isPast ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {h.hora}'s Hour
                  </h4>
                  <p className={`text-[11px] font-semibold mt-1 ${h.isPast ? 'text-slate-400' : config.color}`}>
                    {config.label}
                  </p>
                </div>
                
                <p className={`text-xs leading-relaxed mt-auto ${h.isPast ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {config.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
