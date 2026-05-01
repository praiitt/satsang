
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { musicTranslations } from '@/lib/translations/music';
import { MusicCategoryTabs, type MusicCategory } from '@/components/rraasi-music/music-category-tabs';
import { MusicPlayerCard } from '@/components/rraasi-music/music-player-card';
import { Music, Plus, Headphones, Shuffle, Mic, Sparkles, ShieldCheck, ChevronLeft, History, RefreshCw, Heart, Upload, Globe, Lock } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth } from '@/lib/firebase-client';
import Link from 'next/link';
import { useMusicPlayer } from '@/contexts/music-player-context';
import { PlaylistList } from './playlist-list';
import { PlaylistQuickAccess } from './playlist-quick-access';
import { RecordingsModal } from '@/components/app/recordings-modal';

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
  status?: string; 
  shareId?: string;
  videoUrl?: string; 
  videoStatus?: 'generating' | 'completed' | 'failed' | null;
  story?: string;
  lyrics?: string;
  healingBenefits?: string[];
  tags?: string[];
  isPublic?: boolean;
  metadata?: any;
}

interface RRaaSiMusicWelcomeViewProps {
  onStartCall: (options?: { intention?: string }) => void;
}

export const RRaaSiMusicWelcomeView = ({
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & RRaaSiMusicWelcomeViewProps) => {
  const { language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { playPlaylist } = useMusicPlayer();
  const searchParams = useSearchParams();
  const intentionParam = searchParams.get('intention');

  /* State */
  const [activeCategory, setActiveCategory] = useState<MusicCategory>('all');
  const [showOnlyHealing, setShowOnlyHealing] = useState(false);
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

  // Recordings Modal State
  const [showRecordings, setShowRecordings] = useState(false);

  // Multiselect State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, loading]);

  // Handle Video Autoplay
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
        console.log('[My Music] Raw API response:', data);
        console.log('[My Music] Tracks count:', data.tracks?.length);

        const tracks: MusicTrack[] = (data.tracks || []).flatMap((t: any) => {
          if (t.tracks && Array.isArray(t.tracks) && t.tracks.length > 0) {
            return t.tracks.map((sub: any, idx: number) => ({
              id: sub.sunoId || `${t.id}_${idx}`,
              shareId: sub.sunoId ? `${t.id}?v=${sub.sunoId}` : t.id,
              title: `${t.title || t.trackName || 'Untitled'} (${idx + 1})`,
              audioUrl: sub.audioUrl || sub.audio_url,
              imageUrl: sub.imageUrl || sub.sourceImageUrl || t.imageUrl || t.image_url || t.thumbnailUrl,
              prompt: t.prompt,
              description: t.description || t.caption || t.prompt,
              category: t.category,
              metadata: t.metadata,
              createdAt: t.createdAt || t.created_at,
              status: t.status,
              videoUrl: t.videoUrl,
              videoStatus: t.videoStatus,
              story: sub.story || t.story,
              lyrics: sub.lyrics || t.lyrics,
              healingBenefits: sub.healingBenefits || t.healingBenefits,
              tags: sub.tags || t.tags,
              isPublic: sub.isPublic ?? t.isPublic ?? t.is_public ?? false,
            }));
          }
          return [{
            id: t.id || t.trackId,
            shareId: t.id || t.trackId,
            title: t.title || t.trackName || 'Untitled',
            audioUrl: t.audioUrl || t.audio_url,
            imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
            prompt: t.prompt,
            description: t.description || t.caption || t.prompt,
            category: t.category,
            metadata: t.metadata,
            createdAt: t.createdAt || t.created_at,
            status: t.status,
            videoUrl: t.videoUrl,
            videoStatus: t.videoStatus,
            story: t.story,
            lyrics: t.lyrics,
            healingBenefits: t.healingBenefits,
            tags: t.tags,
            isPublic: t.isPublic ?? t.is_public ?? false,
          }];
        });

        console.log('[My Music] Mapped tracks:', tracks);
        console.log('[My Music] Tracks with audioUrl:', tracks.filter(t => t.audioUrl).length);

        // Filter out incomplete tracks without audioUrl
        const completeTracks = tracks.filter(track => !!track.audioUrl);
        console.log('[My Music] Complete tracks after filtering:', completeTracks.length);

        // Add version numbers for duplicate titles
        const titleCounts = new Map<string, number>();
        const tracksWithVersions = completeTracks.map(track => {
          const baseTitle = track.title;
          const count = titleCounts.get(baseTitle) || 0;
          titleCounts.set(baseTitle, count + 1);

          // If this title appears multiple times, add version number
          if (count > 0 || completeTracks.filter(t => t.title === baseTitle).length > 1) {
            return {
              ...track,
              title: `${baseTitle} (v${count + 1})`
            };
          }
          return track;
        });

        console.log('[My Music] After versioning:', tracksWithVersions.length);

        // Deduplicate by audioUrl (keep first occurrence)
        const uniqueTracks = tracksWithVersions.filter((track, index, self) =>
          index === self.findIndex((t) => (t.audioUrl === track.audioUrl))
        );

        console.log('[My Music] After deduplication:', uniqueTracks.length);
        setMyTracks(uniqueTracks);
      } else {
        console.error('[My Music] API error:', response.status, response.statusText);
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

  // Video Generation Handler
  const handleGenerateVideo = async (sunoId: string, trackDocId?: string) => {
    if (!user?.uid) return;
    if (!trackDocId) {
      console.error("Missing Track Document ID for video generation");
      alert("Cannot generate video: Track ID missing");
      return;
    }

    // Optimistic update
    setMyTracks(prev => prev.map(t =>
      t.id === sunoId ? { ...t, videoStatus: 'generating' } : t
    ));

    try {
      const response = await fetch('/api/suno/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackId: trackDocId,
          sunoId: sunoId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success - status remains generating until callback or refresh
        console.log("Video generation started:", result);
      } else {
        // Revert on failure
        console.error("Video generation failed:", result.error);
        alert(`Failed to start video generation: ${result.error}`);
        setMyTracks(prev => prev.map(t =>
          t.id === sunoId ? { ...t, videoStatus: null } : t
        ));
      }
    } catch (e) {
      console.error("Video generation error:", e);
      setMyTracks(prev => prev.map(t =>
        t.id === sunoId ? { ...t, videoStatus: null } : t
      ));
    }
  };

  // Publish Toggle Handler
  const handlePublishToggle = async (trackId: string, newStatus: boolean) => {
    if (!user?.uid) return;

    // Optimistic update
    setMyTracks(prev => prev.map(t =>
      (t.shareId === trackId || t.id === trackId) ? { ...t, isPublic: newStatus } : t
    ));

    try {
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/rraasi-music/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ trackId, isPublic: newStatus })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to publish');
      }
    } catch (e) {
      console.error("Publish toggle error:", e);
      alert("Failed to update track visibility.");
      // Revert optimistic update
      setMyTracks(prev => prev.map(t =>
        (t.shareId === trackId || t.id === trackId) ? { ...t, isPublic: !newStatus } : t
      ));
    }
  };

  // Bulk Publish Handler
  const handleBulkPublish = async (makePublic: boolean) => {
    if (selectedTracks.size === 0) return;
    
    const selectedIds = Array.from(selectedTracks);
    // Optimistic update
    setMyTracks(prev => prev.map(t => 
      (selectedIds.includes(t.shareId || t.id)) ? { ...t, isPublic: makePublic } : t
    ));
    setSelectionMode(false);
    setSelectedTracks(new Set());

    try {
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/rraasi-music/publish/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ trackIds: selectedIds, isPublic: makePublic })
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to bulk publish');
      }
    } catch (error) {
      console.error("Bulk publish failed", error);
      alert("Failed to update bulk visibility.");
      // Revert optimistic update
      setMyTracks(prev => prev.map(t => 
        (selectedIds.includes(t.shareId || t.id)) ? { ...t, isPublic: !makePublic } : t
      ));
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
      const newTracks: MusicTrack[] = (data.tracks || []).flatMap((t: any) => {
        // If the track has multiple versions/generations inside
        if (t.tracks && Array.isArray(t.tracks) && t.tracks.length > 0) {
          return t.tracks.map((sub: any, idx: number) => ({
            id: sub.sunoId || `${t.id}_${idx}`, // Unique ID for player
            shareId: sub.sunoId ? `${t.id}?v=${sub.sunoId}` : t.id, // Parent Document ID for sharing
            title: `${t.title || 'Untitled'} (${idx + 1})`,
            audioUrl: sub.audioUrl,
            imageUrl: sub.imageUrl || sub.sourceImageUrl || t.imageUrl || t.image_url || t.thumbnailUrl,
            prompt: t.prompt,
            description: t.description || t.caption || t.prompt,
            category: t.category,
            metadata: t.metadata,
            createdAt: t.createdAt,
            createdAt: t.createdAt,
            status: t.status,
            videoUrl: t.videoUrl,
            videoStatus: t.videoStatus,
            story: sub.story || t.story,
            lyrics: sub.lyrics || t.lyrics,
            healingBenefits: sub.healingBenefits || t.healingBenefits,
            tags: sub.tags || t.tags,
          }));
        }

        // Fallback for single tracks or legacy structure
        return [{
          id: t.id,
          shareId: t.id,
          title: t.title || 'Untitled',
          audioUrl: t.audioUrl || t.audio_url,
          imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
          prompt: t.prompt,
          description: t.description || t.caption || t.prompt,
          category: t.category,
          metadata: t.metadata,
          createdAt: t.createdAt,
          status: t.status,
          videoUrl: t.videoUrl,
          videoStatus: t.videoStatus,
          story: t.story,
          lyrics: t.lyrics,
          healingBenefits: t.healingBenefits,
          tags: t.tags,
        }];
      });

      // 1. Filter out incomplete tracks
      const completeTracks = newTracks.filter(t => !!t.audioUrl);

      // 2. Add version numbers for duplicate titles (within this batch)
      const titleCounts = new Map<string, number>();
      // We also need to consider existing tracks to avoid version collisions if possible, 
      // but for infinite scroll, we can mainly focus on the new batch or just handle simplistic versioning.
      // A better approach for community is to version numbers based on the *current displayed list* + *new batch*,
      // but that might be expensive. For now, let's version the current batch to avoid obvious duplicates.
      // Actually, to be consistent with My Music, we should probably do it on the combined list if possible,
      // but 'fetchMusic' appends. Let's do it on the new batch for now.

      const tracksWithVersions = completeTracks.map(track => {
        const baseTitle = track.title;
        const count = titleCounts.get(baseTitle) || 0;
        titleCounts.set(baseTitle, count + 1);

        if (count > 0 || completeTracks.filter(t => t.title === baseTitle).length > 1) {
          return { ...track, title: `${baseTitle} (v${count + 1})` };
        }
        return track;
      });

      // No client-side filtering needed now (backend handles it)
      if (isNewCategory) {
        setMusicTracks(tracksWithVersions);
      } else {
        // Append unique tracks
        setMusicTracks(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNew = tracksWithVersions.filter(t => !existingIds.has(t.id));
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

  const handleDownload = async (track: MusicTrack) => {
    if (!track.audioUrl) return;

    try {
      const response = await fetch(track.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Use title for filename, sanitize characters
      const safeTitle = (track.title || 'track').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${safeTitle}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
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

        {/* Back Button */}
        <Link
          href="/"
          className="absolute top-24 left-6 z-30 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-white shadow-xl hover:bg-white/20 transition-all border border-white/20"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-bold text-xs">EXIT</span>
        </Link>

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

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 px-4 flex-wrap">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onStartCall({ intention: intentionParam || 'create_music' })}
              disabled={authLoading}
              className="h-14 px-8 text-lg font-semibold shadow-xl hover:scale-105 transition-transform bg-gradient-to-r from-amber-500 to-amber-600 border-none"
            >
              {authLoading ? (
                <>
                  <span className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
                  Checking...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  {intentionParam === 'compose_lyrics' ? mt('composeFromLyrics') : mt('startButton')}
                  <span className="ml-2 text-xs opacity-75">• {mt('coinsCost')}</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-white/80 mt-3 text-sm font-medium drop-shadow-sm">
            {mt('freeTrial')}
          </p>
        </div>
      </section >
      {/* How to Use AI Music - Explainer */}
      <section className="mx-auto mt-16 max-w-5xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            {mt('howToManifestTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="relative rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 p-6 shadow-sm dark:backdrop-blur-md text-center">
            <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xl font-bold border border-amber-500/20 dark:border-amber-500/30">
              1
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{mt('manifestStep1Title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mt('manifestStep1Desc')}
            </p>
          </div>

          <div className="relative rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 p-6 shadow-sm dark:backdrop-blur-md text-center">
            <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xl font-bold border border-cyan-500/20 dark:border-cyan-500/30">
              2
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{mt('manifestStep2Title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mt('manifestStep2Desc')}
            </p>
          </div>

          <div className="relative rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 p-6 shadow-sm dark:backdrop-blur-md text-center">
            <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xl font-bold border border-purple-500/20 dark:border-purple-500/30">
              3
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{mt('manifestStep3Title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mt('manifestStep3Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* My Music Section */}
      < section className="max-w-7xl mx-auto px-4 mt-16 border-b border-gray-100 dark:border-gray-800 pb-16" >
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

          {/* Action Buttons (Section Header) */}
          {isAuthenticated && (
            <div className="flex gap-2 flex-wrap items-center">
              {selectionMode && selectedTracks.size > 0 && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleBulkPublish(true)}
                    className="bg-green-600 hover:bg-green-700 text-white border-none shadow-md gap-1"
                  >
                    <Globe className="w-4 h-4" /> <span className="hidden sm:inline">Make </span>Public ({selectedTracks.size})
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleBulkPublish(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white border-none shadow-md gap-1"
                  >
                    <Lock className="w-4 h-4" /> <span className="hidden sm:inline">Make </span>Private ({selectedTracks.size})
                  </Button>
                </>
              )}
              
              <Button
                variant={selectionMode ? "primary" : "dotted"}
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedTracks(new Set());
                }}
                className={selectionMode ? "bg-amber-500 hover:bg-amber-600 border-none text-white shadow-md" : "text-amber-500 border-amber-500/20 hover:bg-amber-500/10"}
              >
                {selectionMode ? "Cancel Selection" : "Select Tracks"}
              </Button>

              {!selectionMode && (
                <Button
                  variant="primary"
                  onClick={() => window.location.href = '/business/creators/music/distribution'}
                  className="text-white bg-amber-600 hover:bg-amber-700 shadow-md border-none"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden lg:inline">Distribute to YouTube</span>
                  <span className="inline lg:hidden">Distribute</span>
                </Button>
              )}

              {/* Refresh Button */}
              {!selectionMode && (
                <Button
                variant="dotted"
                onClick={fetchMyMusic}
                disabled={myTracksLoading}
                className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
                title="Refresh My Music"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${myTracksLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              )}

              {/* Session Recordings Button */}
              <Button
                variant="dotted"
                onClick={() => setShowRecordings(true)}
                className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
              >
                <History className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Session Recordings</span>
              </Button>

              {/* Daily Mix Button */}
              {myTracks.length > 5 && (
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
          )}
        </div>

        {/* Two-column layout: Tracks + Playlist Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main tracks grid */}
          <div className="flex-1">
            {authLoading || myTracksLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myTracks.map((track, index) => (
                  <MusicPlayerCard
                    key={track.id}
                    id={track.id}
                    shareId={track.shareId}
                    title={track.title || 'Untitled'}
                    audioUrl={track.audioUrl}
                    imageUrl={track.imageUrl}
                    category={track.category || 'other'}
                    prompt={track.prompt}
                    description={track.description}
                    createdAt={track.createdAt}
                    onPlay={() => playPlaylist(myTracks, index)}
                    status={track.status}
                    videoUrl={track.videoUrl}
                    videoStatus={track.videoStatus}
                    story={track.story}
                    lyrics={track.lyrics}
                    healingBenefits={track.healingBenefits}
                    metadata={track.metadata}
                    tags={track.tags}
                    isPublic={track.isPublic}
                    isOwner={true}
                    selectionMode={selectionMode}
                    isSelected={selectedTracks.has(track.shareId || track.id)}
                    onToggleSelection={() => {
                      const id = track.shareId || track.id;
                      setSelectedTracks(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(id)) newSet.delete(id);
                        else newSet.add(id);
                        return newSet;
                      });
                    }}
                    onPublishToggle={(newStatus) => handlePublishToggle(track.shareId || track.id, newStatus)}
                    onGenerateVideo={() => handleGenerateVideo(track.id, track.shareId)}
                    onSync={() => handleSync(track.id)}
                    isSyncing={syncingTrackId === track.id}
                    onDownload={() => handleDownload(track)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Playlist Quick Access Sidebar */}
          {isAuthenticated && (
            <div className="lg:w-80 shrink-0">
              <PlaylistQuickAccess
                onSelectPlaylist={async (playlistId) => {
                  // Navigate to playlists tab and play
                  setActiveCategory('playlists');
                  try {
                    const res = await fetch(`/api/playlists/${playlistId}`);
                    if (res.ok) {
                      const data = await res.json();
                      const tracks = (data.tracks || []).map((t: any) => ({
                        id: t.id,
                        title: t.title || 'Untitled',
                        audioUrl: t.audioUrl,
                        imageUrl: t.imageUrl,
                        prompt: t.prompt,
                        description: t.description,
                        category: t.category,
                      }));
                      if (tracks.length > 0) {
                        playPlaylist(tracks, 0);
                      }
                    }
                  } catch (e) {
                    console.error('Failed to play playlist', e);
                  }
                }}
              />
            </div>
          )}
        </div>
      </section >

      {/* Category Tabs & Music Grid */}
      < section className="max-w-7xl mx-auto px-4 mt-16" >
        {/* Browse Header */}
        < div className="text-center mb-8" >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mt('browse.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {mt('browse.subtitle')}
          </p>
        </div >

        {/* Category Filter & Toggles */}
        < div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" >
          <div className="flex-1 w-full overflow-hidden">
            <MusicCategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              language={language}
            />
          </div>
          <button
            onClick={() => setShowOnlyHealing(!showOnlyHealing)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all text-sm border backdrop-blur-md
              ${showOnlyHealing 
                ? 'bg-rose-500/20 shadow-lg text-rose-600 dark:text-rose-400 border-rose-500/50 ring-1 ring-rose-500/50 scale-105' 
                : 'bg-white/50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }
            `}
            title="Show only tracks containing spiritual healing benefits content"
          >
            <Heart className={`w-4 h-4 ${showOnlyHealing ? 'fill-rose-500/50' : ''}`} />
            {language === 'hi' ? 'हीलिंग लाभ' : 'Has Healing Benefits'}
          </button>
        </div >

        {/* Music Content - Grid or Playlists */}
        {
          activeCategory === 'playlists' ? (
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
          ) : musicTracks.length === 0 || (showOnlyHealing && musicTracks.filter(t => t.healingBenefits && t.healingBenefits.length > 0).length === 0) ? (
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
                {musicTracks
                  .filter(track => showOnlyHealing ? (track.healingBenefits && track.healingBenefits.length > 0) : true)
                  .map((track, index) => (
                  <MusicPlayerCard
                    key={track.id}
                    id={track.id}
                    shareId={track.shareId}
                    title={track.title || 'Untitled'}
                    audioUrl={track.audioUrl}
                    imageUrl={track.imageUrl} // Pass imageUrl
                    category={track.category || 'other'}
                    prompt={track.prompt}
                    description={track.description} // Pass description
                    metadata={track.metadata} // Pass metadata for tags
                    createdAt={track.createdAt?.toDate?.()?.toISOString() || track.createdAt || new Date().toISOString()}
                    videoUrl={track.videoUrl}
                    videoStatus={track.videoStatus}
                    onPlay={() => playPlaylist(musicTracks, index)} // Use playlist
                  />
                ))}
              </div>

              <div ref={observerTarget} className="mt-12 text-center h-20 flex items-center justify-center">
                {hasMore && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                    <span className="text-sm font-medium">Loading more spiritual tracks...</span>
                  </div>
                )}
                {!hasMore && musicTracks.length > 0 && (
                  <p className="text-gray-500 text-sm">You've reached the end of the collection.</p>
                )}
              </div>
            </>
          )
        }
      </section>

      {/* Explore More RRAASI Services */}
      <section className="max-w-7xl mx-auto px-4 mt-16 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Explore More from RRAASI
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Discover our complete suite of AI-powered spiritual and creative tools, each designed to elevate different aspects of your journey.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Satsang */}
          <a
            href="/satsang"
            className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-amber-500 rounded-2xl p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-400">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /><path d="M20 3v4M22 5h-4" />
              </svg>
            </div>
            <h3 className="text-gray-900 dark:text-white text-xl font-bold mb-2 group-hover:text-amber-600 transition-colors">
              AI Satsang
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
              Connect with AI-powered spiritual gurus for personalized guidance. Experience authentic dialogue with masters from various traditions.
            </p>
            <div className="flex items-center text-amber-600 font-semibold text-sm">
              Start Satsang
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </a>

          {/* Tarot */}
          <a
            href="/tarot"
            className="group relative bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-amber-500 rounded-2xl p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg overflow-hidden"
          >
            <div className="absolute top-3 right-3 rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
              Coming Soon
            </div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 15h10M7 11h10M7 7h10" />
              </svg>
            </div>
            <h3 className="text-gray-900 dark:text-white text-xl font-bold mb-2 group-hover:text-amber-600 transition-colors">
              Mystic Tarot
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
              Receive personalized tarot readings with AI-guided interpretations. Gain clarity on your path through ancient wisdom.
            </p>
            <div className="flex items-center text-amber-600 font-semibold text-sm opacity-60">
              Early Access Soon
              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </a>

          {/* Vedic Astrology */}
          <a
            href="/vedic-jyotish"
            className="group relative bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-amber-500 rounded-2xl p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg overflow-hidden"
          >
            <div className="absolute top-3 right-3 rounded-full bg-pink-100 dark:bg-pink-900/30 px-3 py-1 text-xs font-semibold text-pink-700 dark:text-pink-300">
              Coming Soon
            </div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600 dark:text-pink-400">
                <circle cx="12" cy="12" r="10" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h3 className="text-gray-900 dark:text-white text-xl font-bold mb-2 group-hover:text-amber-600 transition-colors">
              Vedic Astrology
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
              Explore your birth chart with authentic Jyotish readings. Discover planetary influences and life patterns through Vedic wisdom.
            </p>
            <div className="flex items-center text-amber-600 font-semibold text-sm opacity-60">
              Early Access Soon
              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </a>
        </div>

        {/* Bottom description */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-3xl mx-auto">
            All RRAASI services integrate seamlessly with your spiritual journey. Each tool is designed with authenticity, powered by cutting-edge AI, and grounded in ancient wisdom.
          </p>
        </div>
      </section>

      {/* Recordings Modal */}
      <RecordingsModal
        isOpen={showRecordings}
        onClose={() => setShowRecordings(false)}
      />

      {/* Floating Create Button (Mobile) */}
      <button
        onClick={() => onStartCall({ intention: intentionParam || 'create_music' })}
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
