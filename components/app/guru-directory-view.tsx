'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { GURUS, type GuruDefinition, type GuruTradition, getAllTraditions } from '@/lib/gurus';
import { GuruCard } from './guru-card';

interface GuruDirectoryViewProps {
  onGuruSelect?: (guru: GuruDefinition) => void;
}

export function GuruDirectoryView({ onGuruSelect }: GuruDirectoryViewProps) {
  const { t } = useLanguage();
  const [selectedTradition, setSelectedTradition] = useState<GuruTradition | 'All'>('All');

  const traditions = useMemo(() => ['All' as const, ...getAllTraditions()], []);

  const filteredGurus = useMemo(() => {
    if (selectedTradition === 'All') {
      return GURUS;
    }
    return GURUS.filter((guru) => guru.tradition === selectedTradition);
  }, [selectedTradition]);

  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16">
      {/* Section Header */}
      <div className="mb-8 text-center">
        <h2 className="text-foreground mb-3 text-3xl font-bold sm:text-4xl">
          {t('welcome.findYourGuru')}
        </h2>
        <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-7 sm:text-lg">
          {t('welcome.findYourGuruDesc')}
        </p>
      </div>

      {/* Tradition Filter */}
      <div className="mb-8 flex flex-wrap justify-center gap-3">
        {traditions.map((tradition) => (
          <Button
            key={tradition}
            variant={selectedTradition === tradition ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTradition(tradition)}
            className="rounded-full"
          >
            {tradition === 'All' ? t('welcome.allTraditions') : tradition}
          </Button>
        ))}
      </div>

      {/* Guru Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGurus.map((guru) => (
          <GuruCard
            key={guru.id}
            guru={guru}
            onClick={onGuruSelect ? () => onGuruSelect(guru) : undefined}
          />
        ))}

        {/* Create Your Own Guru Card - Disabled for now, will launch later */}
        {/* <div
          className="from-primary/10 to-primary/5 border-primary/20 group relative flex cursor-pointer flex-col rounded-2xl border-2 border-dashed bg-gradient-to-br p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => router.push('/create-guru')}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="text-4xl">✨</div>
            <div className="flex-1">
              <h3 className="text-foreground text-xl font-bold">{t('welcome.createGuru')}</h3>
              <p className="text-muted-foreground text-sm">{t('welcome.allTraditions')}</p>
            </div>
          </div>

          <p className="text-muted-foreground mb-4 flex-1 text-sm leading-6">
            {t('welcome.createGuruDesc')}
          </p>

          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/create-guru');
            }}
          >
            {t('welcome.createGuru')} →
          </Button>
        </div> */}
      </div>

      {/* Empty State */}
      {filteredGurus.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-lg">No gurus found for this tradition.</p>
          <Button variant="link" onClick={() => setSelectedTradition('All')} className="mt-4">
            Show all gurus
          </Button>
        </div>
      )}
    </section>
  );
}
