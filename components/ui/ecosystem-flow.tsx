'use client';

import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, Flame, ArrowRight, Compass, Headphones } from 'lucide-react';

export function EcosystemFlow() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 10 }
    }
  };

  const lineVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: { 
      scaleX: 1, 
      opacity: 1,
      transition: { duration: 0.8, ease: "easeInOut" }
    }
  };

  return (
    <div className="w-full py-16 bg-gradient-to-b from-transparent via-[#1a1005] to-transparent relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none opacity-30">
        <div className="w-[800px] h-[300px] bg-amber-500/20 blur-[120px] rounded-[100%]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent mb-4">
            The RRAASI Ecosystem
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A continuous, interconnected loop of spiritual diagnosis, processing, and creative integration.
          </p>
        </div>

        <motion.div 
          className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          
          {/* Node 1: Locate */}
          <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center text-center relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-purple-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)] group hover:scale-105 transition-transform duration-300">
              <Compass className="w-10 h-10 text-purple-300 group-hover:text-purple-100 transition-colors" />
            </div>
            <div className="bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 border border-purple-500/20">
              1. Locate
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Diagnose & Map</h3>
            <p className="text-sm text-gray-400 max-w-[240px]">
              Astrology, Tarot, Satsang Gurus & ET Agents help map your energetic state and identify hidden blocks.
            </p>
          </motion.div>

          {/* Connection Line 1 (Desktop) */}
          <motion.div 
            variants={lineVariants}
            className="hidden md:flex w-24 h-px bg-gradient-to-r from-purple-500 via-amber-500 to-orange-500 origin-left relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
              <ArrowRight className="w-5 h-5 text-amber-500" />
            </div>
          </motion.div>

          {/* Connection Line 1 (Mobile) */}
          <div className="md:hidden h-8 w-px bg-gradient-to-b from-purple-500 to-amber-500 my-2 relative">
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-90">
              <ArrowRight className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          {/* Node 2: Process */}
          <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center text-center relative z-10">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-700 to-orange-900 border-2 border-amber-500/50 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.4)] relative group hover:scale-105 transition-transform duration-300">
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping opacity-50" />
              <MessageSquare className="w-12 h-12 text-amber-300 group-hover:text-white transition-colors" />
            </div>
            <div className="bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 border border-amber-500/20">
              2. Process
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Inner Work</h3>
            <p className="text-sm text-gray-400 max-w-[220px]">
              Engage deeply with ancient wisdom to intellectually process your diagnosis and understand the remedy.
            </p>
          </motion.div>

          {/* Connection Line 2 (Desktop) */}
          <motion.div 
            variants={lineVariants}
            className="hidden md:flex w-24 h-px bg-gradient-to-r from-orange-500 via-cyan-500 to-emerald-500 origin-left relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
              <ArrowRight className="w-5 h-5 text-emerald-500" />
            </div>
          </motion.div>

          {/* Connection Line 2 (Mobile) */}
          <div className="md:hidden h-8 w-px bg-gradient-to-b from-orange-500 to-emerald-500 my-2 relative">
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-90">
              <ArrowRight className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          {/* Node 3: Execute */}
          <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center text-center relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-900 to-cyan-900 border-2 border-emerald-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] group hover:scale-105 transition-transform duration-300">
              <Flame className="w-10 h-10 text-emerald-300 group-hover:text-white transition-colors" />
            </div>
            <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
              3. Execute
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Integration & Healing</h3>
            <p className="text-sm text-gray-400 max-w-[200px]">
              Manifest the exact music, frequencies, and conscious actions required to embody the cure.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
