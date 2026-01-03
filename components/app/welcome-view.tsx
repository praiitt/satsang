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

function WelcomeImage() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      <path
        d="M15 24V40C15 40.7957 14.6839 41.5587 14.1213 42.1213C13.5587 42.6839 12.7956 43 12 43C11.2044 43 10.4413 42.6839 9.87868 42.1213C9.31607 41.5587 9 40.7957 9 40V24C9 23.2044 9.31607 22.4413 9.87868 21.8787C10.4413 21.3161 11.2044 21 12 21C12.7956 21 13.5587 21.3161 14.1213 21.8787C14.6839 22.4413 15 23.2044 15 24ZM22 5C21.2044 5 20.4413 5.31607 19.8787 5.87868C19.3161 6.44129 19 7.20435 19 8V56C19 56.7957 19.3161 57.5587 19.8787 58.1213C20.4413 58.6839 21.2044 59 22 59C22.7956 59 23.5587 58.6839 24.1213 58.1213C24.6839 57.5587 25 56.7957 25 56V8C25 7.20435 24.6839 6.44129 24.1213 5.87868C23.5587 5.31607 22.7956 5 22 5ZM32 13C31.2044 13 30.4413 13.3161 29.8787 13.8787C29.3161 14.4413 29 15.2044 29 16V48C29 48.7957 29.3161 49.5587 29.8787 50.1213C30.4413 50.6839 31.2044 51 32 51C32.7956 51 33.5587 50.6839 34.1213 50.1213C34.6839 49.5587 35 48.7957 35 48V16C35 15.2044 34.6839 14.4413 34.1213 13.8787C33.5587 13.3161 32.7956 13 32 13ZM42 21C41.2043 21 40.4413 21.3161 39.8787 21.8787C39.3161 22.4413 39 23.2044 39 24V40C39 40.7957 39.3161 41.5587 39.8787 42.1213C40.4413 42.6839 41.2043 43 42 43C42.7957 43 43.5587 42.6839 44.1213 42.1213C44.6839 41.5587 45 40.7957 45 40V24C45 23.2044 44.6839 22.4413 44.1213 21.8787C43.5587 21.3161 42.7957 21 42 21ZM52 17C51.2043 17 50.4413 17.3161 49.8787 17.8787C49.3161 18.4413 49 19.2044 49 20V44C49 44.7957 49.3161 45.5587 49.8787 46.1213C50.4413 46.6839 51.2043 47 52 47C52.7957 47 53.5587 46.6839 54.1213 46.1213C54.6839 45.5587 55 44.7957 55 44V20C55 19.2044 54.6839 18.4413 54.1213 17.8787C53.5587 17.3161 52.7957 17 52 17Z"
        fill="currentColor"
      />
    </svg>
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
    </div>
  );
};
