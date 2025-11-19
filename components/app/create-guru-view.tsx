'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

export function CreateGuruView() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 text-6xl">✨</div>
        <h1 className="text-foreground mb-4 text-4xl font-bold sm:text-5xl">
          {t('createGuru.title')}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-7">
          {t('createGuru.description')}
        </p>
      </div>

      {/* Vision Section */}
      <section className="bg-primary/10 border-primary/20 mb-12 rounded-2xl border p-8">
        <h2 className="text-foreground mb-4 text-2xl font-bold">{t('createGuru.visionTitle')}</h2>
        <p className="text-muted-foreground leading-7">{t('createGuru.visionDesc')}</p>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold">
          {t('createGuru.howItWorks')}
        </h2>
        <div className="space-y-6">
          <div className="bg-background border-input flex gap-6 rounded-xl border p-6">
            <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-foreground mb-2 text-xl font-semibold">
                {t('createGuru.step1Title')}
              </h3>
              <p className="text-muted-foreground leading-6">{t('createGuru.step1Desc')}</p>
            </div>
          </div>

          <div className="bg-background border-input flex gap-6 rounded-xl border p-6">
            <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-foreground mb-2 text-xl font-semibold">
                {t('createGuru.step2Title')}
              </h3>
              <p className="text-muted-foreground leading-6">{t('createGuru.step2Desc')}</p>
              <div className="bg-muted mt-4 rounded-lg p-4 font-mono text-sm">
                <code>python scripts/generate-agent.py --config your-guru-config.json</code>
              </div>
            </div>
          </div>

          <div className="bg-background border-input flex gap-6 rounded-xl border p-6">
            <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-foreground mb-2 text-xl font-semibold">
                {t('createGuru.step3Title')}
              </h3>
              <p className="text-muted-foreground leading-6">{t('createGuru.step3Desc')}</p>
            </div>
          </div>

          <div className="bg-background border-input flex gap-6 rounded-xl border p-6">
            <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-foreground mb-2 text-xl font-semibold">
                {t('createGuru.step4Title')}
              </h3>
              <p className="text-muted-foreground leading-6">{t('createGuru.step4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration Example */}
      <section className="bg-muted mb-12 rounded-xl p-8">
        <h2 className="text-foreground mb-4 text-2xl font-bold">{t('createGuru.configExample')}</h2>
        <p className="text-muted-foreground mb-4 text-sm">{t('createGuru.configExampleDesc')}</p>
        <div className="bg-background border-input overflow-x-auto rounded-lg border p-4">
          <pre className="text-xs">
            <code>{`{
  "agent_name": "myguru",
  "display_name": "My Spiritual Guide",
  "route": "/my-guru",
  "instructions": "You are a spiritual guide...",
  "features": [
    "Meditation guidance",
    "Spiritual teachings"
  ],
  "greetings": {
    "en": "Welcome, seeker...",
    "hi": "स्वागत है, साधक..."
  }
}`}</code>
          </pre>
        </div>
      </section>

      {/* Resources */}
      <section className="mb-12">
        <h2 className="text-foreground mb-6 text-2xl font-bold">{t('createGuru.resources')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-background border-input rounded-xl border p-6">
            <h3 className="text-foreground mb-2 font-semibold">{t('createGuru.resource1Title')}</h3>
            <p className="text-muted-foreground mb-4 text-sm">{t('createGuru.resource1Desc')}</p>
            <code className="bg-muted rounded px-2 py-1 text-xs">
              scripts/agent-config.example.json
            </code>
          </div>
          <div className="bg-background border-input rounded-xl border p-6">
            <h3 className="text-foreground mb-2 font-semibold">{t('createGuru.resource2Title')}</h3>
            <p className="text-muted-foreground mb-4 text-sm">{t('createGuru.resource2Desc')}</p>
            <code className="bg-muted rounded px-2 py-1 text-xs">
              scripts/README-agent-generator.md
            </code>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground rounded-2xl p-8 text-center">
        <h2 className="mb-4 text-2xl font-bold">{t('createGuru.ctaTitle')}</h2>
        <p className="mb-6 opacity-90">{t('createGuru.ctaDesc')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/')}
            className="bg-background text-foreground hover:bg-background/90"
          >
            {t('createGuru.backToHome')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/')}
            className="border-background text-background hover:bg-background/10"
          >
            {t('createGuru.browseGurus')}
          </Button>
        </div>
      </section>
    </div>
  );
}
