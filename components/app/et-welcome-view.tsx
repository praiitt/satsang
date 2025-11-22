'use client';

import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

function ETWelcomeImage() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      {/* Simple UFO/alien symbol */}
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="32" cy="28" r="8" fill="currentColor" />
      <path d="M24 40 L32 36 L40 40" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

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

  // Use translation if startButtonText is not provided, otherwise use the provided text
  const buttonText = startButtonText || t('etAgent.startButton');

  return (
    <div ref={ref} className="w-full pb-24 md:pb-32">
      {/* Hero Section */}
      <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
        <ETWelcomeImage />

        <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
          {t('etAgent.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl">
          {t('etAgent.description')}
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
        <p className="text-muted-foreground mt-3 text-sm">{t('etAgent.freeTrial')}</p>
      </section>

      {/* Key Features Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {t('etAgent.features')}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1: ET Civilizations */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">👽</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.etCivilizations')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.etCivilizationsDesc')}
            </p>
          </div>

          {/* Feature 2: Fermi Paradox */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🌌</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.fermiParadox')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.fermiParadoxDesc')}
            </p>
          </div>

          {/* Feature 3: Healing Frequencies */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🎵</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.healingFrequencies')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.healingFrequenciesDesc')}
            </p>
          </div>

          {/* Feature 4: Civilization Frequencies */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🌟</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.starSystemFrequencies')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.starSystemFrequenciesDesc')}
            </p>
          </div>

          {/* Feature 5: ET Spiritual Teachings */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">📿</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.etSpiritualTeachings')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.etSpiritualTeachingsDesc')}
            </p>
          </div>

          {/* Feature 6: Cosmic Consciousness */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">✨</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.cosmicConsciousness')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.cosmicConsciousnessDesc')}
            </p>
          </div>

          {/* Feature 7: Human Channeling with ET */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🔮</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.humanChanneling')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.humanChannelingDesc')}
            </p>
          </div>

          {/* Feature 8: Guided Lucid Dream */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🌙</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {t('etAgent.guidedLucidDream')}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {t('etAgent.guidedLucidDreamDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto mt-8 max-w-4xl px-4">
        <div className="bg-primary text-primary-foreground flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-base font-semibold sm:text-left">{t('etAgent.ctaReady')}</p>
          <div className="flex gap-3">
            <Button
              onClick={onStartCall}
              variant="ghost"
              className="h-12 bg-white/10 hover:bg-white/20"
            >
              {t('etAgent.ctaStartNow')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
