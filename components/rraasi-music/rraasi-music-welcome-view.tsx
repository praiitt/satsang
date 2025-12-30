'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { musicTranslations } from '@/lib/translations/music';
import { MusicCategoryTabs, type MusicCategory } from '@/components/rraasi-music/music-category-tabs';
import { MusicPlayerCard } from '@/components/rraasi-music/music-player-card';
import { Music, Plus, Headphones } from 'lucide-react';
import { useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { useAuth } from '@/components/auth/auth-provider';

function MusicIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="2" />
      <path
        d="M32 20 L32 44 M28 42 A4 4 0 1 0 36 42 A4 4 0 1 0 28 42"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="currentColor"
      />
    </svg>
  );
}

interface MusicTrack {
  id: string;
  title: string;
  audioUrl: string;
  prompt?: string;
  category?: MusicCategory;
  createdAt: any;
}

interface RRaaSiMusicWelcomeViewProps {
  onStartCall: () => void;
}

export const RRaaSiMusicWelcomeView = ({
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & RRaaSiMusicWelcomeViewProps) => {
  const { language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeCategory, setActiveCategory] = useState<MusicCategory>('all');
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [myTracks, setMyTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTracksLoading, setMyTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const mt = (key: string) => {
    const keys = key.split('.');
    let value: any = musicTranslations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  useEffect(() => {
    fetchMusic();
  }, [activeCategory]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyMusic();
    } else if (!authLoading) {
      setMyTracks([]);
      setMyTracksLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const fetchMyMusic = async () => {
    setMyTracksLoading(true);
    try {
      const response = await fetch('/api/rraasi-music/my-tracks');
      if (response.ok) {
        const data = await response.json();
        const tracks: MusicTrack[] = (data.tracks || []).map((t: any) => ({
          id: t.id || t.trackId,
          title: t.title || t.trackName || 'Untitled',
          audioUrl: t.audioUrl || t.audio_url,
          prompt: t.prompt,
          category: t.category,
          createdAt: t.createdAt || t.created_at,
        }));
        setMyTracks(tracks);
      }
    } catch (error) {
      console.error('Error fetching my music:', error);
    } finally {
      setMyTracksLoading(false);
    }
  };

  const fetchMusic = async () => {
    setLoading(true);
    setError(null);
    try {
      const db = getFirebaseFirestore();
      let q = query(
        collection(db, 'music_tracks'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );

      // Filter by category if not 'all'
      if (activeCategory !== 'all') {
        q = query(
          collection(db, 'music_tracks'),
          where('category', '==', activeCategory),
          orderBy('createdAt', 'desc'),
          limit(12)
        );
      }

      const snapshot = await getDocs(q);
      const tracks: MusicTrack[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as MusicTrack));

      setMusicTracks(tracks);
    } catch (error) {
      console.error('Error fetching music:', error);
      setError(mt('browse.error') || 'Failed to load music');
      setMusicTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (trackId: string) => {
    // Pause any currently playing track
    setCurrentlyPlaying(trackId);
  };

  return (
    <div ref={ref} className="w-full pb-24">
      {/* Simplified Hero Section */}
      <section className="bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <MusicIcon />
          <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {mt('title')}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            {mt('subtitle')}
          </p>

          {/* Create Music CTA */}
          <Button
            variant="primary"
            size="lg"
            onClick={onStartCall}
            className="mt-8 h-14 px-8 text-lg font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {mt('startButton')}
            <span className="ml-2 text-xs opacity-75">• 50 coins</span>
          </Button>
          <p className="text-muted-foreground mt-3 text-sm">
            {mt('freeTrial')}
          </p>
        </div>
      </section>

      {/* My Music Section */}
      <section className="max-w-7xl mx-auto px-4 mt-16 border-b border-gray-100 dark:border-gray-800 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
            <Headphones className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Music
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Your personal spiritual creations
            </p>
          </div>
        </div>

        {authLoading || myTracksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse flex items-center justify-center">
                <Music className="w-8 h-8 text-gray-300 dark:text-gray-700" />
              </div>
            ))}
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">Please log in to see your personal music creations</p>
            <Button onClick={() => window.location.href = '/login'} variant="primary" size="lg">
              Login to RRAASI
            </Button>
          </div>
        ) : myTracks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">You haven't created any tracks yet. Let's make something beautiful together!</p>
            <Button onClick={onStartCall} variant="outline" size="lg" className="border-amber-500 text-amber-600 hover:bg-amber-50">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Spiritual Track
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTracks.map((track) => (
              <MusicPlayerCard
                key={track.id}
                title={track.title || 'Untitled'}
                audioUrl={track.audioUrl}
                category={track.category || 'other'}
                prompt={track.prompt}
                createdAt={track.createdAt}
                onPlay={() => handlePlay(track.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Category Tabs & Music Grid */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        {/* Browse Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mt('browse.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {mt('browse.subtitle')}
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <MusicCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            language={language}
          />
        </div>

        {/* Music Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{mt('browse.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
            <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</p>
          </div>
        ) : musicTracks.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              {mt('browse.noResults')}
            </p>
            <p className="text-gray-500 dark:text-gray-500 mb-6">
              {mt('browse.createFirst')}
            </p>
            <Button onClick={onStartCall} variant="primary">
              <Plus className="w-5 h-5 mr-2" />
              {mt('startButton')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {musicTracks.map((track) => (
              <MusicPlayerCard
                key={track.id}
                title={track.title || 'Untitled'}
                audioUrl={track.audioUrl}
                category={track.category || 'other'}
                prompt={track.prompt}
                createdAt={track.createdAt?.toDate?.()?.toISOString() || new Date(track.createdAt).toISOString()}
                onPlay={() => handlePlay(track.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Create Button (Mobile) */}
      <button
        onClick={onStartCall}
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all duration-200 z-50"
        aria-label="Create music - 50 coins"
        title="Create music - 50 coins"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};
