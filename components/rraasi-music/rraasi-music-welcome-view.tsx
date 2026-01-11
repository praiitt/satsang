'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { musicTranslations } from '@/lib/translations/music';
import { MusicCategoryTabs, type MusicCategory } from '@/components/rraasi-music/music-category-tabs';
import { MusicPlayerCard } from '@/components/rraasi-music/music-player-card';
import { Music, Plus, Headphones, Shuffle } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { useAuth } from '@/components/auth/auth-provider';
import { useMusicPlayer } from '@/contexts/music-player-context';
import { PlaylistList } from './playlist-list';

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
  imageUrl?: string;
  prompt?: string;
  description?: string;
  category?: MusicCategory;
  createdAt: any;
  status?: string; // Add status
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
  const { playPlaylist } = useMusicPlayer();

  /* State */
  const [activeCategory, setActiveCategory] = useState<MusicCategory>('all');
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [myTracks, setMyTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [myTracksLoading, setMyTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Sync State
  const [syncingTrackId, setSyncingTrackId] = useState<string | null>(null);

  // Video State
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Attempt to handle autoplay policy
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay prevented:", error);
          if (!isMuted) {
            setIsMuted(true);
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play();
            }
          }
        });
      }
    }
  }, []);

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

  // Reset pagination when category changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setMusicTracks([]); // Clear existing tracks
    fetchMusic(1, true); // Fetch first page
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
          imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl, // Map image
          prompt: t.prompt,
          description: t.description || t.caption || t.prompt, // Map description (fallback to prompt)
          category: t.category,
          createdAt: t.createdAt || t.created_at,
          status: t.status, // Map status
        }));

        // De-dupe by Audio URL (fix for backend creating potential duplicates/variations that look identical)
        const uniqueTracks = tracks.filter((track, index, self) =>
          index === self.findIndex((t) => (t.audioUrl && t.audioUrl === track.audioUrl))
        );

        setMyTracks(uniqueTracks);
      }
    } catch (error) {
      console.error('Error fetching my music:', error);
    } finally {
      setMyTracksLoading(false);
    }
  };

  // Manual Sync Handler
  const handleSync = async (trackId: string) => {
    if (!user?.uid) return;

    setSyncingTrackId(trackId);
    try {
      // Call the backend sync endpoint
      const response = await fetch('/api/suno/sync', { // Corrected path to match next.config.ts rewrite
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: trackId,
          userId: user.uid
        })
      });

      const result = await response.json();
      if (result.success || result.audioUrl) {
        // Refresh list to show updated status
        await fetchMyMusic();
      } else {
        // Even if not complete, refreshing might show updated 'Generating' time or partials
        // But let's just refresh regardless after a delay
        setTimeout(() => fetchMyMusic(), 1000);
      }
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncingTrackId(null);
    }
  };

  // Updated fetchMusic to use API
  const fetchMusic = async (pageNum: number, isNewCategory = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      // Build API URL with category
      let url = `/api/rraasi-music/community-tracks?page=${pageNum}&limit=30&category=${activeCategory}`;

      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch tracks');

      const data = await response.json();
      const newTracks: MusicTrack[] = (data.tracks || []).map((t: any) => ({
        id: t.id,
        title: t.title || 'Untitled',
        audioUrl: t.audioUrl || t.audio_url,
        imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl, // Map image
        prompt: t.prompt,
        description: t.description || t.caption || t.prompt, // Map description (fallback to prompt)
        category: t.category,
        metadata: t.metadata, // Include metadata for tags
        createdAt: t.createdAt, // Backend should return serialized date or timestamp
      }));

      // No client-side filtering needed now (backend handles it)
      if (isNewCategory) {
        setMusicTracks(newTracks);
      } else {
        // Append unique tracks
        setMusicTracks(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNew = newTracks.filter(t => !existingIds.has(t.id));
          return [...prev, ...uniqueNew];
        });
      }

      // Check if we have more pages (Backend returns accurate hasMore)
      setHasMore(data.hasMore);

    } catch (error) {
      console.error('Error fetching music:', error);
      setError(mt('browse.error') || 'Failed to load music');
      if (isNewCategory) setMusicTracks([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMusic(nextPage, false);
  };

  const handlePlay = (trackId: string) => {
    // Pause any currently playing track
    setCurrentlyPlaying(trackId);
  };

  // Daily Mix Handler
  const [isShuffling, setIsShuffling] = useState(false);

  const handleDailyMix = async () => {
    if (!isAuthenticated || !user?.uid) return;

    setIsShuffling(true);
    try {
      // Fetch up to 100 tracks for the mix
      const response = await fetch('/api/rraasi-music/my-tracks?limit=100');
      if (response.ok) {
        const data = await response.json();
        let tracks: MusicTrack[] = (data.tracks || []).map((t: any) => ({
          id: t.id || t.trackId,
          title: t.title || t.trackName || 'Untitled',
          audioUrl: t.audioUrl || t.audio_url,
          imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
          prompt: t.prompt,
          description: t.description || t.caption || t.prompt,
          category: t.category,
          createdAt: t.createdAt || t.created_at,
          status: t.status,
        }));

        // Fisher-Yates Shuffle
        for (let i = tracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
        }

        if (tracks.length > 0) {
          playPlaylist(tracks, 0);
        }
      }
    } catch (error) {
      console.error('Error creating Daily Mix:', error);
    } finally {
      setIsShuffling(false);
    }
  };

  return (
    <div ref={ref} className="w-full pb-24">
      {/* Hero Section with Rraasi Video */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-end px-4 pt-24 pb-6 text-center overflow-hidden">
        {/* Rraasi Video Background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <video
            ref={videoRef}
            autoPlay
            loop={false}
            muted={isMuted}
            playsInline
            className="h-full w-full object-cover object-[65%_center] md:object-center"
          >
            <source src="https://storage.googleapis.com/ips_bucket_video/37cfd7f4c0fa4524b99a3beffe68155c.mp4" type="video/mp4" />
          </video>
          {/* Gradient Overlays for Blending */}
          {/* Subtle Gradients for Depth (Video remains bright) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />

        </div>

        {/* Prominent Sound Control */}
        <button
          onClick={toggleMute}
          className="absolute top-24 right-6 z-30 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-white shadow-xl hover:bg-white/20 transition-all border border-white/20"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
              <span className="font-bold text-xs">UNMUTE</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span className="font-bold text-xs">MUTE</span>
            </>
          )}
        </button>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          {/* Icon Removed */}
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-7xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
            {mt('title')}
          </h1>
          <div className="inline-block rounded-xl bg-black/30 backdrop-blur-md px-6 py-4 mb-8 border border-white/10">
            <p className="text-white font-bold text-xl md:text-2xl drop-shadow-md">
              {mt('subtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartCall}
              disabled={authLoading}
              className="h-14 px-8 text-lg font-semibold shadow-xl hover:scale-105 transition-transform"
            >
              {authLoading ? (
                <>
                  <span className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
                  Checking account...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  {mt('startButton')}
                  <span className="ml-2 text-xs opacity-75">• 50 coins</span>
                </>
              )}
            </Button>

            {/* Daily Mix Button (Hero) */}
            {isAuthenticated && myTracks.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleDailyMix}
                disabled={isShuffling}
                className="h-14 px-8 text-lg font-semibold bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-transform"
              >
                {isShuffling ? (
                  <span className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
                ) : (
                  <Shuffle className="w-5 h-5 mr-2" />
                )}
                Play Daily Mix
              </Button>
            )}
          </div>
          <p className="text-white/80 mt-3 text-sm font-medium drop-shadow-sm">
            {mt('freeTrial')}
          </p>
        </div>
      </section>

      {/* My Music Section */}
      <section className="max-w-7xl mx-auto px-4 mt-16 border-b border-gray-100 dark:border-gray-800 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
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

          {/* Daily Mix Button (Section Header) */}
          {isAuthenticated && myTracks.length > 5 && (
            <Button
              variant="dotted"
              onClick={handleDailyMix}
              disabled={isShuffling}
              className="hidden md:flex text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
            >
              {isShuffling ? (
                <span className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></span>
              ) : (
                <Shuffle className="w-4 h-4 mr-2" />
              )}
              Shuffle All
            </Button>
          )}
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
            {myTracks.map((track, index) => (
              <MusicPlayerCard
                key={track.id}
                title={track.title || 'Untitled'}
                audioUrl={track.audioUrl}
                imageUrl={track.imageUrl} // Pass imageUrl
                category={track.category || 'other'}
                prompt={track.prompt}
                description={track.description} // Pass description
                createdAt={track.createdAt}
                onPlay={() => playPlaylist(myTracks, index)} // Use playlist
                status={track.status} // Pass status
                onSync={() => handleSync(track.id)} // Pass sync handler
                isSyncing={syncingTrackId === track.id} // Pass specific loading state
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

        {/* Music Content - Grid or Playlists */}
        {activeCategory === 'playlists' ? (
          isAuthenticated ? (
            <PlaylistList
              onPlayPlaylist={async (id) => {
                try {
                  const res = await fetch(`/api/playlists/details/${id}`); // Ensure this matches backend route
                  if (res.ok) {
                    const data = await res.json();
                    const tracks = (data.tracks || []).map((t: any) => ({
                      id: t.id || t.trackId,
                      title: t.title || t.trackName || 'Untitled',
                      audioUrl: t.audioUrl || t.audio_url,
                      imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
                      prompt: t.prompt,
                      description: t.description || t.caption || t.prompt,
                      category: t.category,
                      createdAt: t.createdAt,
                      status: t.status,
                    }));

                    if (tracks.length > 0) {
                      playPlaylist(tracks, 0);
                    } else {
                      alert('This playlist is empty!');
                    }
                  }
                } catch (e) {
                  console.error("Failed to play playlist", e);
                }
              }}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">Please log in to see your playlists</p>
              <Button onClick={() => window.location.href = '/login'} variant="primary" size="lg">
                Login to RRAASI
              </Button>
            </div>
          )
        ) : loading ? (
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
            <Button onClick={onStartCall} variant="primary" disabled={authLoading}>
              <Plus className="w-5 h-5 mr-2" />
              {mt('startButton')}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {musicTracks.map((track, index) => (
                <MusicPlayerCard
                  key={track.id}
                  title={track.title || 'Untitled'}
                  audioUrl={track.audioUrl}
                  imageUrl={track.imageUrl} // Pass imageUrl
                  category={track.category || 'other'}
                  prompt={track.prompt}
                  description={track.description} // Pass description
                  metadata={track.metadata} // Pass metadata for tags
                  createdAt={track.createdAt?.toDate?.()?.toISOString() || track.createdAt || new Date().toISOString()}
                  onPlay={() => playPlaylist(musicTracks, index)} // Use playlist
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-12 text-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  size="lg"
                  disabled={loadingMore}
                  className="min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Load More Tracks'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Floating Create Button (Mobile) */}
      <button
        onClick={onStartCall}
        disabled={authLoading}
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all duration-200 z-50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Create music - 50 coins"
        title="Create music - 50 coins"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};
