'use client';

import { motion } from 'motion/react';
import { Sparkles, Star, Zap } from 'lucide-react';
import type { EnergyProfile, UserProfile } from '@/lib/services/userService';

interface EnergyPassportCardProps {
  userProfile: UserProfile;
}

export function EnergyPassportCard({ userProfile }: EnergyPassportCardProps) {
  // Default values if energyProfile doesn't exist yet
  const energy = userProfile.energyProfile || {
    rank: 'Seeker',
    totalKarmaPoints: 0,
    currentStreak: 0,
    dominantElement: 'Aether',
    chakraAlignment: 50,
  };

  // Determine aura colors based on rank or dominant element
  let auraGradients = 'from-slate-400 via-slate-300 to-slate-200';
  let badgeColor = 'bg-slate-800 text-white';
  
  switch (energy.rank) {
    case 'Guru':
      auraGradients = 'from-amber-400 via-yellow-300 to-orange-400';
      badgeColor = 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white';
      break;
    case 'Ascended':
      auraGradients = 'from-purple-400 via-fuchsia-300 to-pink-400';
      badgeColor = 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white';
      break;
    case 'Mystic':
      auraGradients = 'from-indigo-400 via-blue-400 to-cyan-400';
      badgeColor = 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white';
      break;
    case 'Initiate':
      auraGradients = 'from-emerald-400 via-teal-300 to-cyan-400';
      badgeColor = 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white';
      break;
    case 'Seeker':
    default:
      auraGradients = 'from-orange-300 via-amber-200 to-yellow-200';
      badgeColor = 'bg-gradient-to-r from-orange-500 to-amber-500 text-white';
      break;
  }

  // Calculate progress to next rank
  let nextRankTarget = 201; // Default to Initiate
  let progress = 0;
  
  if (energy.totalKarmaPoints >= 5000) {
    nextRankTarget = energy.totalKarmaPoints; // Maxed out
    progress = 100;
  } else if (energy.totalKarmaPoints >= 2001) {
    nextRankTarget = 5000;
    progress = ((energy.totalKarmaPoints - 2001) / (5000 - 2001)) * 100;
  } else if (energy.totalKarmaPoints >= 701) {
    nextRankTarget = 2001;
    progress = ((energy.totalKarmaPoints - 701) / (2001 - 701)) * 100;
  } else if (energy.totalKarmaPoints >= 201) {
    nextRankTarget = 701;
    progress = ((energy.totalKarmaPoints - 201) / (701 - 201)) * 100;
  } else {
    nextRankTarget = 201;
    progress = (energy.totalKarmaPoints / 201) * 100;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl p-[2px] shadow-2xl w-full max-w-4xl mx-auto mb-8"
    >
      {/* Animated Aura Border */}
      <div className={`absolute inset-0 bg-gradient-to-br ${auraGradients} opacity-70 animate-pulse`} style={{ animationDuration: '3s' }} />
      <div className={`absolute inset-0 bg-gradient-to-tr ${auraGradients} opacity-40 blur-xl`} />

      {/* Inner Card content */}
      <div className="relative bg-white/90 dark:bg-slate-950/90 backdrop-blur-3xl rounded-[22px] p-8 flex flex-col md:flex-row items-center gap-8">
        
        {/* Avatar & Rank Ring */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className={`w-32 h-32 rounded-full p-1 bg-gradient-to-br ${auraGradients} shadow-[0_0_30px_rgba(0,0,0,0.2)]`}>
            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center border-[3px] border-white/50 dark:border-black/50 overflow-hidden">
               {userProfile.profilePhoto ? (
                  <img src={userProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  <span className="text-5xl font-bold bg-gradient-to-br from-slate-400 to-slate-600 bg-clip-text text-transparent">
                     {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </span>
               )}
            </div>
          </div>
          <div className={`absolute -bottom-3 px-4 py-1.5 rounded-full ${badgeColor} text-sm font-bold shadow-lg flex items-center gap-1`}>
            <Sparkles className="w-4 h-4" />
            {energy.rank}
          </div>
        </div>

        {/* Passport Stats */}
        <div className="flex-1 w-full space-y-5">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center justify-center md:justify-start gap-2">
              {userProfile.name || 'Spiritual Seeker'}
              <span className="text-lg font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                 Energy Passport
              </span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1 flex justify-center md:justify-start gap-4">
               <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" /> {energy.totalKarmaPoints} Karma Points</span>
               <span className="flex items-center gap-1"><Star className="w-4 h-4 text-orange-500" /> {energy.currentStreak} Day Streak</span>
            </p>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
             <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                <span>Current: {energy.totalKarmaPoints} XP</span>
                <span>Next Rank: {energy.totalKarmaPoints >= 5000 ? 'Max Level' : `${nextRankTarget} XP`}</span>
             </div>
             <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 1, delay: 0.5 }}
                   className={`h-full bg-gradient-to-r ${auraGradients}`}
                />
             </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
