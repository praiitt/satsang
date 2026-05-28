'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ScanLine } from 'lucide-react';
import { getFirebaseApp } from '@/lib/firebase-client';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export function CosmicTransmissions() {
  const [transmissions, setTransmissions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Fetch Transmissions from Firestore
  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, 'cosmic_transmissions'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransmissions(data);
      // Reset index when data changes
      setCurrentIndex(0);
    });

    return () => unsubscribe();
  }, []);

  const currentTransmission = transmissions[currentIndex];

  // Typewriter effect
  useEffect(() => {
    if (!currentTransmission) return;
    
    setIsTyping(true);
    setDisplayedText('');
    
    let i = 0;
    const fullText = currentTransmission.message;
    
    // Random typing speed for authentic terminal feel
    const typeWriter = () => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
        setTimeout(typeWriter, Math.random() * 30 + 10); // 10-40ms per char
      } else {
        setIsTyping(false);
      }
    };
    
    typeWriter();

    // Cleanup timeout on unmount or transmission change
    return () => {
      let highestId = window.setTimeout(() => {});
      for (let j = highestId; j >= 0; j--) {
        window.clearTimeout(j);
      }
    };
  }, [currentIndex, currentTransmission]);

  // Cycle transmissions every 15 seconds after typing finishes
  useEffect(() => {
    if (isTyping || transmissions.length <= 1) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % transmissions.length);
    }, 10000); // Wait 10 seconds before next message

    return () => clearTimeout(timer);
  }, [isTyping, currentIndex, transmissions.length]);

  if (!currentTransmission) return null; // Don't render anything if no transmissions

  return (
    <div className="w-full max-w-4xl mx-auto px-4 my-16">
      <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            </div>
            <span className="text-xs tracking-[0.2em] font-mono text-slate-400">
              LIVE TRANSMISSION INTERCEPT
            </span>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/50 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
          </div>
        </div>

        {/* Terminal Body */}
        <div className="relative p-6 md:p-8 font-mono min-h-[220px]">
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10 flex flex-col justify-between">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="w-full h-[1px] bg-white" />
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTransmission.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <ScanLine className={`w-5 h-5 ${currentTransmission.color}`} />
                  <span className={`text-sm tracking-widest font-bold ${currentTransmission.color}`}>
                    [{currentTransmission.civilization}]
                  </span>
                </div>
                <span className="text-xs text-slate-500 tracking-wider">
                  DATE_LOG: {currentTransmission.date}
                </span>
              </div>

              <div className="text-slate-300 text-sm md:text-base leading-relaxed tracking-wide h-full">
                {displayedText}
                <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-[ping_1s_infinite]" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
