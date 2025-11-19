'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import type { GuruDefinition } from '@/lib/gurus';

interface GuruCardProps {
  guru: GuruDefinition;
  onClick?: () => void;
}

export function GuruCard({ guru, onClick }: GuruCardProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(guru.route);
    }
  };

  const name = t(guru.nameKey) || guru.name;
  const tagline = t(guru.taglineKey) || guru.tagline;
  const description = t(guru.descriptionKey) || guru.description;
  const talkToGuruTemplate = t('welcome.talkToGuru');
  const talkToGuruText = talkToGuruTemplate.replace('{name}', name);

  return (
    <div
      className="bg-background border-input group relative flex cursor-pointer flex-col rounded-2xl border p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="mb-4 flex items-center gap-3">
        <div className="text-4xl">{guru.icon}</div>
        <div className="flex-1">
          <h3 className="text-foreground text-xl font-bold">{name}</h3>
          <p className="text-muted-foreground text-sm">{guru.tradition}</p>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-foreground mb-3 text-sm font-medium">{tagline}</p>

      {/* Description */}
      <p className="text-muted-foreground mb-4 line-clamp-3 flex-1 text-sm leading-6">
        {description}
      </p>

      {/* Tags */}
      {guru.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {guru.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs"
            >
              {tag}
            </span>
          ))}
          {guru.tags.length > 3 && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs">
              +{guru.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* CTA Button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        {talkToGuruText}
      </Button>
    </div>
  );
}
