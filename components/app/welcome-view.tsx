'use client';

/* eslint-disable prettier/prettier */
import { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomGuruInterestForm } from '@/components/app/custom-guru-interest-form';
import { GuruDirectoryView } from '@/components/app/guru-directory-view';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import type { GuruDefinition } from '@/lib/gurus';
import { FindYourGuruQuiz } from '@/components/find-your-guru-quiz';
import { MySpiritualCircle } from './my-spiritual-circle';

function WelcomeImage() {
  return (
    <div className="w-24 h-24 relative rounded-full border-4 border-amber-500/30 bg-black/20 backdrop-blur-sm shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center overflow-hidden animate-in fade-in zoom-in duration-700">
      <img src="/services/satsang-icon-fixed.png" alt="Satsang" className="w-full h-full object-cover" />
    </div>
  );
}



interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  const { t } = useLanguage();
  const router = useRouter();

  const handleGuruSelect = useCallback(
    (guru: GuruDefinition) => {
      // Navigate to the guru's route page
      router.push(guru.route);
    },
    [router]
  );

  // Video State
  // Moved to dedicated section below

  return (
    <div ref={ref} className="w-full pb-24 md:pb-32">
      {/* Hero Section - Always visible at top */}
      {/* Hero Section - Always visible at top */}
      {/* Unified Hero Section with Video */}
      <section className="relative w-full py-12 md:py-20 lg:py-24 bg-background overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left Column: Content & Actions */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-10">
              <div className="text-foreground drop-shadow-sm mb-6">
                <WelcomeImage />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                {t('welcome.title')}
              </h1>

              {t('welcome.subtitle') && (
                <p className="text-lg sm:text-xl font-medium text-muted-foreground mb-4 max-w-2xl">
                  {t('welcome.subtitle')}
                </p>
              )}

              <p className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-muted-foreground mb-10 max-w-2xl">
                {t('welcome.description')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center lg:justify-start">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const element = document.getElementById('guru-directory');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      onStartCall();
                    }
                  }}
                  className="h-14 w-full sm:w-auto px-8 text-lg font-bold shadow-xl hover:scale-105 transition-transform"
                >
                  {t('welcome.discoverGurus')}
                </Button>

                <div className="flex justify-center">
                  <FindYourGuruQuiz
                    trigger={
                      <Button
                        variant="secondary"
                        size="lg"
                        className="h-14 w-full sm:w-auto px-8 text-lg font-semibold shadow-lg hover:bg-muted text-foreground gap-2"
                      >
                        {t('quiz.triggerButton')}
                      </Button>
                    }
                  />
                </div>
              </div>

              <p className="text-muted-foreground mt-6 text-sm font-medium">
                {t('welcome.freeTrial')}
              </p>
            </div>

            {/* Right Column: Video Player */}
            <div className="flex justify-center lg:justify-end w-full relative z-10 mt-8 lg:mt-0">
              {/* 9:16 Vertical Video Frame */}
              <div className="relative w-full max-w-[320px] aspect-[9/16] overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-900 bg-zinc-950 shadow-2xl ring-1 ring-white/10">
                <video
                  autoPlay
                  muted
                  loop={false}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                  poster="/product-video-poster.jpg"
                >
                  <source src="https://storage.googleapis.com/satsangpublicurls/Raassi_Intro.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {/* Glossy Overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay"></div>
              </div>

              {/* Background Decorative Blob for Video */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[600px] bg-purple-500/20 blur-[100px] -z-10 rounded-full"></div>
            </div>

          </div>
        </div>
      </section>



      {/* My Spiritual Circle */}
      <MySpiritualCircle />

      {/* Guru Directory Section */}
      <div id="guru-directory">
        <GuruDirectoryView onGuruSelect={handleGuruSelect} />
      </div>

      {/* Custom Guru Interest Form */}
      <CustomGuruInterestForm />

      {/* Key Features Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {t('welcome.features')}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1: Voice AI Assistant */}
          <div
            onClick={onStartCall}
            className="bg-background border-input hover:border-primary h-full cursor-pointer rounded-2xl border p-6 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="mb-3 text-3xl">🎤</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">{t('welcome.voiceAI')}</h3>
            <p className="text-muted-foreground text-sm leading-6">{t('welcome.voiceAIDesc')}</p>
          </div>

          {/* Feature 2: Hindi Language Support */}
          <div
            onClick={onStartCall}
            className="bg-background border-input hover:border-primary h-full cursor-pointer rounded-2xl border p-6 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="mb-3 text-3xl">🇮🇳</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('welcome.hindiSupport')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('welcome.hindiSupportDesc')}
            </p>
          </div>

          {/* Feature 3: Bhajan Playback */}
          <div
            onClick={onStartCall}
            className="bg-background border-input hover:border-primary h-full cursor-pointer rounded-2xl border p-6 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="mb-3 text-3xl">🎵</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('welcome.playBhajans')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('welcome.playBhajansDesc')}
            </p>
          </div>

          {/* Feature 4: Vani/Pravachan Playback */}
          <div
            onClick={onStartCall}
            className="bg-background border-input hover:border-primary h-full cursor-pointer rounded-2xl border p-6 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="mb-3 text-3xl">📿</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('welcome.pravachanVani')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('welcome.pravachanVaniDesc')}
            </p>
          </div>

          {/* Feature 5: Spiritual Guidance */}
          <div
            onClick={onStartCall}
            className="bg-background border-input hover:border-primary h-full cursor-pointer rounded-2xl border p-6 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="mb-3 text-3xl">🕉️</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('welcome.spiritualGuidance')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('welcome.spiritualGuidanceDesc')}
            </p>
          </div>

          {/* Feature 6: Easy Setup */}
          <div
            onClick={onStartCall}
            className="bg-background border-input hover:border-primary h-full cursor-pointer rounded-2xl border p-6 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="mb-3 text-3xl">✨</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">{t('welcome.easySetup')}</h3>
            <p className="text-muted-foreground text-sm leading-6">{t('welcome.easySetupDesc')}</p>
          </div>
        </div>
      </section>

      {/* CTA: After Features */}
      <section className="mx-auto mt-6 max-w-4xl px-4">
        <div className="bg-background border-input flex flex-col items-center gap-3 rounded-2xl border p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-foreground text-base font-medium sm:text-left">
            {t('welcome.ctaReady')}
          </p>
          <div className="flex gap-3">
            <Button onClick={onStartCall} variant="primary" size="lg" className="h-12">
              {t('welcome.ctaStartSatsang')}
            </Button>
            <Button asChild variant="secondary" className="h-12">
              <a href="#product-video">{t('welcome.ctaWatchDemo')}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto mt-12 max-w-4xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {t('welcome.howItWorks')}
        </h2>
        <div className="bg-background border-input rounded-2xl border p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                1
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  {t('welcome.step1Title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">{t('welcome.step1Desc')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                2
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  {t('welcome.step2Title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">{t('welcome.step2Desc')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                3
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  {t('welcome.step3Title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">{t('welcome.step3Desc')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                4
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  {t('welcome.step4Title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">{t('welcome.step4Desc')}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="link">
              <a href="#faq">{t('welcome.faq')}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {t('welcome.useCases')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">💬</div>
            <p className="text-muted-foreground text-sm">{t('welcome.useCase1')}</p>
          </div>
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">🎵</div>
            <p className="text-muted-foreground text-sm">{t('welcome.useCase2')}</p>
          </div>
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">📚</div>
            <p className="text-muted-foreground text-sm">{t('welcome.useCase3')}</p>
          </div>
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">🧘</div>
            <p className="text-muted-foreground text-sm">{t('welcome.useCase4')}</p>
          </div>
        </div>
      </section>

      {/* CTA: After Use Cases */}
      <section className="mx-auto mt-8 max-w-4xl px-4">
        <div className="bg-primary text-primary-foreground flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-base font-semibold sm:text-left">{t('welcome.ctaOneClick')}</p>
          <div className="flex gap-3">
            <Button
              onClick={onStartCall}
              variant="ghost"
              className="h-12 bg-white/10 hover:bg-white/20"
            >
              {t('welcome.ctaStartNow')}
            </Button>
            <Button asChild variant="ghost" className="h-12 bg-white/10 hover:bg-white/20">
              <a href="#faq">{t('welcome.ctaViewFAQ')}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="mx-auto mt-12 max-w-4xl px-4 sm:mt-16">
        <div className="bg-background border-input rounded-2xl border p-8 text-center shadow-sm">
          <h2 className="text-foreground mb-4 text-2xl font-bold sm:text-3xl">
            {t('welcome.technology')}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-7 sm:text-base">
            {t('welcome.technologyDesc')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
              {t('welcome.aiPowered')}
            </div>
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
              {t('welcome.realTime')}
            </div>
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
              {t('welcome.secure')}
            </div>
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
              {t('welcome.browserBased')}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto my-12 max-w-4xl px-4 pb-8 sm:my-16 sm:pb-10">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {t('welcome.faq')}
        </h2>
        <div className="space-y-4">
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq1Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq1Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq2Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq2Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq3Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq3Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq4Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq4Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq5Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq5Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq6Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq6Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq7Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq7Answer')}
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">
              {t('welcome.faq8Question')}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t('welcome.faq8Answer')}
            </p>
          </details>
        </div>
      </section>

      {/* Explore More RRAASI Services */}
      <section className="mx-auto my-12 max-w-6xl px-4 sm:my-16">
        <div className="text-center mb-12">
          <h2 className="text-foreground text-3xl font-bold sm:text-4xl mb-4">
            Explore More from RRAASI
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our complete suite of AI-powered spiritual and creative tools, each designed to elevate different aspects of your journey.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* RRAASI Music */}
          <a
            href="/rraasi-music"
            className="group bg-background border-input hover:border-primary rounded-2xl border p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h3 className="text-foreground text-xl font-bold mb-2 group-hover:text-primary transition-colors">
              RRAASI Music
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              Create healing frequencies, bhajans, and meditation music powered by AI. Transform your spiritual lyrics into divine melodies.
            </p>
            <div className="flex items-center text-primary font-semibold text-sm">
              Explore Music
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </a>

          {/* Tarot */}
          <a
            href="/tarot"
            className="group relative bg-background border-input hover:border-primary rounded-2xl border p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg overflow-hidden"
          >
            <div className="absolute top-3 right-3 rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
              Coming Soon
            </div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 15h10M7 11h10M7 7h10" />
              </svg>
            </div>
            <h3 className="text-foreground text-xl font-bold mb-2 group-hover:text-primary transition-colors">
              Mystic Tarot
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              Receive personalized tarot readings with AI-guided interpretations. Gain clarity on your path through ancient wisdom.
            </p>
            <div className="flex items-center text-primary font-semibold text-sm opacity-60">
              Early Access Soon
              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </a>

          {/* Vedic Astrology */}
          <a
            href="/vedic-jyotish"
            className="group relative bg-background border-input hover:border-primary rounded-2xl border p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg overflow-hidden"
          >
            <div className="absolute top-3 right-3 rounded-full bg-pink-100 dark:bg-pink-900/30 px-3 py-1 text-xs font-semibold text-pink-700 dark:text-pink-300">
              Coming Soon
            </div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600 dark:text-pink-400">
                <circle cx="12" cy="12" r="10" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h3 className="text-foreground text-xl font-bold mb-2 group-hover:text-primary transition-colors">
              Vedic Astrology
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              Explore your birth chart with authentic Jyotish readings. Discover planetary influences and life patterns through Vedic wisdom.
            </p>
            <div className="flex items-center text-primary font-semibold text-sm opacity-60">
              Early Access Soon
              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </a>
        </div>

        {/* Bottom description */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm max-w-3xl mx-auto">
            All RRAASI services integrate seamlessly with your spiritual journey. Each tool is designed with authenticity, powered by cutting-edge AI, and grounded in ancient wisdom.
          </p>
        </div>
      </section>
    </div>
  );
};
