'use client';

import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

function OshoWelcomeImage() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      {/* Simple Osho symbol - lotus/meditation symbol */}
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="32" cy="28" r="6" fill="currentColor" />
      <path
        d="M20 40 Q32 36 44 40"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24 48 Q32 44 40 48"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface OshoWelcomeViewProps {
  startButtonText?: string;
  onStartCall: () => void;
}

export const OshoWelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & OshoWelcomeViewProps) => {
  const { t } = useLanguage();

  // Use translation if startButtonText is not provided, otherwise use the provided text
  const buttonText = startButtonText || t('oshoAgent.startButton');

  return (
    <div ref={ref} className="w-full pb-24 md:pb-32">
      {/* Hero Section */}
      <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
        <OshoWelcomeImage />

        <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
          {t('oshoAgent.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl">
          {t('oshoAgent.description')}
        </p>

        {/* Action Button */}
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartCall}
            className="h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px]"
          >
            {buttonText}
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{t('oshoAgent.freeTrial')}</p>
      </section>

      {/* Key Features Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {t('oshoAgent.features')}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1: Meditation */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🧘</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('oshoAgent.meditation')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('oshoAgent.meditationDesc')}
            </p>
          </div>

          {/* Feature 2: Consciousness */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">✨</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('oshoAgent.consciousness')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('oshoAgent.consciousnessDesc')}
            </p>
          </div>

          {/* Feature 3: Zen Philosophy */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🌸</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('oshoAgent.zenPhilosophy')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('oshoAgent.zenPhilosophyDesc')}
            </p>
          </div>

          {/* Feature 4: Dynamic Meditation */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🎭</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('oshoAgent.dynamicMeditation')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('oshoAgent.dynamicMeditationDesc')}
            </p>
          </div>

          {/* Feature 5: Sannyas */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🟠</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">{t('oshoAgent.sannyas')}</h3>
            <p className="text-muted-foreground text-sm leading-6">{t('oshoAgent.sannyasDesc')}</p>
          </div>

          {/* Feature 6: Osho Discourses */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">📿</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('oshoAgent.oshoDiscourses')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('oshoAgent.oshoDiscoursesDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto mt-8 max-w-4xl px-4">
        <div className="bg-primary text-primary-foreground flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-base font-semibold sm:text-left">{t('oshoAgent.ctaReady')}</p>
          <div className="flex gap-3">
            <Button
              onClick={onStartCall}
              variant="ghost"
              className="h-12 bg-white/10 hover:bg-white/20"
            >
              {t('oshoAgent.ctaStartNow')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
