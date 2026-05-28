'use client';

import { HeroVideoPlayer } from '@/components/app/hero-video-player';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { motion } from 'framer-motion';
import { 
  Rocket, 
  Atom, 
  Activity, 
  Star, 
  BookOpen, 
  Sparkles, 
  Eye, 
  Moon,
  ChevronRight
} from 'lucide-react';

interface ETWelcomeViewProps {
  startButtonText?: string;
  onStartCall: () => void;
}

export const ETWelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & ETWelcomeViewProps) => {
  const { t } = useLanguage();
  const buttonText = startButtonText || t('etAgent.startButton');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const features = [
    { icon: Rocket, titleKey: 'etAgent.etCivilizations', descKey: 'etAgent.etCivilizationsDesc', color: 'text-purple-400' },
    { icon: Atom, titleKey: 'etAgent.fermiParadox', descKey: 'etAgent.fermiParadoxDesc', color: 'text-cyan-400' },
    { icon: Activity, titleKey: 'etAgent.healingFrequencies', descKey: 'etAgent.healingFrequenciesDesc', color: 'text-fuchsia-400' },
    { icon: Star, titleKey: 'etAgent.starSystemFrequencies', descKey: 'etAgent.starSystemFrequenciesDesc', color: 'text-amber-400' },
    { icon: BookOpen, titleKey: 'etAgent.etSpiritualTeachings', descKey: 'etAgent.etSpiritualTeachingsDesc', color: 'text-emerald-400' },
    { icon: Sparkles, titleKey: 'etAgent.cosmicConsciousness', descKey: 'etAgent.cosmicConsciousnessDesc', color: 'text-blue-400' },
    { icon: Eye, titleKey: 'etAgent.humanChanneling', descKey: 'etAgent.humanChannelingDesc', color: 'text-rose-400' },
    { icon: Moon, titleKey: 'etAgent.guidedLucidDream', descKey: 'etAgent.guidedLucidDreamDesc', color: 'text-indigo-400' },
  ];

  return (
    <div ref={ref} className="w-full min-h-screen bg-[#030014] overflow-hidden relative pb-24 md:pb-32 font-sans text-slate-200">
      
      {/* Cosmic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-cyan-900/10 blur-[100px]" />
      </div>

      {/* Hero Section (Split Screen) */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-8 min-h-[90vh]">
        
        {/* Left: Typography & CTA */}
        <motion.div 
          className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Cosmic Intelligence Portal</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 drop-shadow-[0_0_30px_rgba(192,132,252,0.3)]">
              {t('etAgent.title')}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300/80 max-w-2xl leading-relaxed mb-10 font-light">
            {t('etAgent.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={onStartCall}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-full overflow-hidden transition-all duration-300 shadow-[0_0_40px_rgba(168,85,247,0.4)] hover:shadow-[0_0_60px_rgba(168,85,247,0.6)] hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <span className="relative z-10">{buttonText}</span>
              <ChevronRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Right: Video Player */}
        <motion.div 
          className="flex-1 w-full max-w-2xl lg:max-w-none relative"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          {/* Decorative glowing border rings */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-purple-600 via-transparent to-cyan-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl backdrop-blur-sm mx-auto max-w-sm lg:max-w-[360px]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            <HeroVideoPlayer
              src="https://storage.googleapis.com/rraasi-public-assets/ETAgent_Intro.mp4"
              poster="https://storage.googleapis.com/rraasi-public-assets/ETAgent_Intro.mp4#t=0.1"
              autoPlay
              loop
              muted // Important for autoplay policy
              className="w-full aspect-[9/16] object-cover"
            />
            {/* Optional video caption overlay */}
            <div className="absolute bottom-6 left-6 right-6 z-20">
               <h3 className="text-xl font-semibold text-white mb-2">{t('etAgent.videoTitle') || 'Discover the ET Agent Experience'}</h3>
               {t('etAgent.videoDescription') && (
                 <p className="text-sm text-white/70 line-clamp-2">{t('etAgent.videoDescription')}</p>
               )}
            </div>
          </div>
        </motion.div>

      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 mt-12 md:mt-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
            {t('etAgent.features')}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 mx-auto rounded-full" />
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-2 hover:border-purple-500/30 overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-full top-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent group-hover:translate-y-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                
                <div className={`w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-5 shadow-lg ${feature.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-3 tracking-wide">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">
                  {t(feature.descKey)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mt-32 mb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden p-1"
        >
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 animate-[spin_4s_linear_infinite] opacity-50" />
          
          <div className="relative bg-[#0a0518] rounded-[22px] px-8 py-12 text-center md:flex md:items-center md:justify-between md:text-left">
            <div className="md:max-w-xl">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('etAgent.ctaReady')}</h3>
              <p className="text-slate-400 text-sm md:text-base">Prepare yourself for an immersive journey into cosmic consciousness and advanced extraterrestrial wisdom.</p>
            </div>
            
            <button
              onClick={onStartCall}
              className="mt-8 md:mt-0 whitespace-nowrap inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-semibold transition-all backdrop-blur-md"
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
              {t('etAgent.ctaStartNow')}
            </button>
          </div>
        </motion.div>
      </section>

    </div>
  );
};
