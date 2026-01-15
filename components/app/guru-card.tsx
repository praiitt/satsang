'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import type { GuruDefinition } from '@/lib/gurus';
import { Heart, UserCheck, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserData } from '@/components/providers/user-data-provider';
import { SocialShareMenu } from '@/components/shared/social-share-menu';

interface GuruCardProps {
  guru: GuruDefinition;
  onClick?: () => void;
}

export function GuruCard({ guru, onClick }: GuruCardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { isFavorite, isFollowing, toggleFavorite, toggleFollow } = useUserData();

  const isFav = isFavorite(guru.id);
  const isFollowingGuru = isFollowing(guru.id);

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
      {/* Action Buttons (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <SocialShareMenu
          title={name}
          text={`Chat with ${name} on RRAASI - ${tagline}`}
          url={`https://rraasi.com${guru.route}`}
          className="bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm rounded-full"
          iconClassName="text-muted-foreground hover:text-foreground"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(guru.id);
          }}
          className="p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm transition-colors"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isFav ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"
            )}
          />
        </button>
      </div>

      {/* Icon & Name */}
      <div className="mb-4 flex items-center gap-3 pr-8">
        <div className="text-4xl">{guru.icon}</div>
        <div className="flex-1">
          <h3 className="text-foreground text-xl font-bold flex items-center gap-2">
            {name}
            {/* Follow Toggle (Small Icon) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow(guru.id);
              }}
              className={cn(
                "p-1 rounded-md text-xs border transition-all flex items-center gap-1",
                isFollowingGuru
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-transparent border-muted hover:border-primary text-muted-foreground"
              )}
              title={isFollowingGuru ? "Unfollow" : "Follow"}
            >
              {isFollowingGuru ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
              {isFollowingGuru ? "Following" : "Follow"}
            </button>
          </h3>
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
