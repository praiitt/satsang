
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/contexts/language-context';
import { musicTranslations } from '@/lib/translations/music';
import { MusicCategoryTabs, type MusicCategory } from '@/components/spiritual-studio/music-category-tabs';
import { MusicPlayerCard } from '@/components/spiritual-studio/music-player-card';
import { Music, Video, Image as ImageIcon, Plus, Headphones, Shuffle, Mic, Sparkles, ShieldCheck, ChevronLeft, History, RefreshCw, Heart, Upload, Globe, Lock, Coins, Share2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useMusicPlayer } from '@/contexts/music-player-context';
import { cn } from '@/lib/utils';
import { PlaylistList } from './playlist-list';
import { SearchBar } from './search-bar';
import { PlaylistQuickAccess } from './playlist-quick-access';
import { RecordingsModal } from '@/components/app/recordings-modal';
import { RecentChatsModal } from '@/components/app/recent-chats-modal';
import { RecentChatsSection } from '@/components/app/recent-chats-section';
import { useFavorites } from '@/hooks/use-favorites';
import BuyCoinsModal from '@/components/spiritual-studio/buy-coins-modal';
import { PromptWizardModal } from './prompt-wizard-modal';
import { useSpiritualState } from '@/hooks/use-spiritual-state';
import { ReadingToMusicModal } from './reading-to-music-modal';
import { SpiritualReelsStudio } from '@/components/gallery/spiritual-reels-studio';
import { SpiritualArtStudio } from '@/components/gallery/spiritual-art-studio';
import { CommunityArtGallery } from '@/components/spiritual-studio/community-art-gallery';

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
  videoGeneratingStartedAt?: number | null; // epoch ms — used to detect stale locks
  story?: string;
  lyrics?: string;
  healingBenefits?: string[];
  tags?: string[];
  isPublic?: boolean;
  metadata?: any;
  source?: string;
  generatedVideoImages?: string[];
  userId?: string; // track owner UID
}

export interface DiscoverFeedViewProps {
  onStartCall: (options?: { intention?: string }) => void;
}

export const DiscoverFeedView = ({
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & DiscoverFeedViewProps) => {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { currentTrack, isPlaying, playTrack, playPlaylist, togglePlayPause } = useMusicPlayer();
  const { isFavorite, toggleFavorite, fetchFavoriteTracks, favoriteIds } = useFavorites();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [favoriteTracks, setFavoriteTracks] = useState<MusicTrack[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [myMusicFilter, setMyMusicFilter] = useState<'all' | 'favorites' | 'satsang'>('all');
  const [myTracksLoading, setMyTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [curatedPlaylists, setCuratedPlaylists] = useState<any[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(false);
  const [visibleMyMusicCount, setVisibleMyMusicCount] = useState(6);
  const [selectedCuratedPlaylist, setSelectedCuratedPlaylist] = useState<any | null>(null);
  const [loadingPlaylistDetails, setLoadingPlaylistDetails] = useState(false);
  const [showMyVault, setShowMyVault] = useState(false);

  // Global Spiritual State (Energy Passport)
  const { spiritualState } = useSpiritualState();
  // Sync State
  const [syncingTrackId, setSyncingTrackId] = useState<string | null>(null);

  // Video State
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Recordings Modal State
  const [showRecordings, setShowRecordings] = useState(false);
  const [showRecentChats, setShowRecentChats] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isReelsStudioOpen, setIsReelsStudioOpen] = useState(false);
  const [isArtStudioOpen, setIsArtStudioOpen] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);

  // Coin Balance State
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [payoutBalance, setPayoutBalance] = useState<number | null>(null);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [playlistLinkCopied, setPlaylistLinkCopied] = useState(false);

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

  // Fetch coin balance
  useEffect(() => {
    if (!user?.uid) return;
    const fetchBalance = async () => {
      try {
        const auth = getFirebaseAuth();
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(
          'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service/coins/balance',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
            setCoinBalance(data.balance?.totalCoins ?? 0);
            setPayoutBalance(data.balance?.payoutBalance ?? 0);
        }
      } catch { /* silent */ }
    };
    fetchBalance();
  }, [user?.uid]);

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

  // Reset pagination when category or search changes
  useEffect(() => {
    if (activeCategory === 'favorites') return; // Favorites handled separately
    setPage(1);
    setHasMore(true);
    setMusicTracks([]); // Clear existing tracks
    fetchMusic(1, true); // Fetch first page
  }, [activeCategory, searchQuery]);

  // Load favorites when favorites tab is active
  useEffect(() => {
    if (activeCategory !== 'favorites') return;
    const loadFavorites = async () => {
      setLoadingFavorites(true);
      const data = await fetchFavoriteTracks();
      const tracks: MusicTrack[] = (data.tracks || []).flatMap((t: any) => {
        if (t.tracks && Array.isArray(t.tracks) && t.tracks.length > 0) {
          return t.tracks.map((sub: any, idx: number) => ({
            id: sub.sunoId || `${t.id}_${idx}`,
            shareId: t.id,
            title: `${t.title || 'Untitled'} (${idx + 1})`,
            audioUrl: sub.audioUrl,
            imageUrl: sub.imageUrl || sub.sourceImageUrl || t.imageUrl,
            prompt: t.prompt,
            description: t.description,
            category: t.category,
            metadata: t.metadata,
            createdAt: t.createdAt,
            status: t.status,
            story: t.story,
            lyrics: t.lyrics,
            healingBenefits: t.healingBenefits,
            tags: t.tags,
            isPublic: t.isPublic ?? false,
          }));
        }
        return [{
          id: t.id,
          shareId: t.id,
          title: t.title || 'Untitled',
          audioUrl: t.audioUrl,
          imageUrl: t.imageUrl,
          prompt: t.prompt,
          description: t.description,
          category: t.category,
          metadata: t.metadata,
          createdAt: t.createdAt,
          status: t.status,
          story: t.story,
          lyrics: t.lyrics,
          healingBenefits: t.healingBenefits,
          tags: t.tags,
          isPublic: t.isPublic ?? false,
        }];
      });
      setFavoriteTracks(tracks.filter(t => !!t.audioUrl));
      setLoadingFavorites(false);
    };
    loadFavorites();
  }, [activeCategory, fetchFavoriteTracks]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyMusic(1, true);
    } else if (!authLoading) {
      setMyTracks([]);
      setMyTracksLoading(false);
    }
  }, [isAuthenticated, authLoading, searchQuery]);

  useEffect(() => {
    const loadCuratedPlaylists = async () => {
      setCuratedLoading(true);
      try {
        const res = await fetch('/api/rraasi-music/playlists/curated');
        const data = await res.json();
        setCuratedPlaylists(data.playlists || []);
      } catch (e) {
        console.error('Failed to fetch curated playlists', e);
      } finally {
        setCuratedLoading(false);
      }
    };
    loadCuratedPlaylists();
  }, []);

  const fetchMyMusic = async (pageNum = 1, isNew = false) => {
    if (pageNum === 1) setMyTracksLoading(true);
    try {
      let url = `/api/rraasi-music/my-tracks?page=${pageNum}&limit=50`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (activeCategory !== 'all') url += `&category=${activeCategory}`;
      
      const response = await fetch(url);
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
              videoStatus: t.videoUrl ? 'completed' : (t.videoGenerating ? 'generating' : (t.videoStatus || null)),
              videoGeneratingStartedAt: t.videoGeneratingStartedAt?._seconds
                ? t.videoGeneratingStartedAt._seconds * 1000
                : (t.videoGeneratingStartedAt ?? null),
              story: sub.story || t.story,
              lyrics: sub.lyrics || t.lyrics,
              healingBenefits: sub.healingBenefits || t.healingBenefits,
              tags: sub.tags || t.tags,
              isPublic: sub.isPublic ?? t.isPublic ?? t.is_public ?? false,
              source: t.source,
              generatedVideoImages: t.generatedVideoImages || [],
              userId: t.userId || null,
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
            videoStatus: t.videoUrl ? 'completed' : (t.videoGenerating ? 'generating' : null),
            videoGeneratingStartedAt: t.videoGeneratingStartedAt?._seconds
              ? t.videoGeneratingStartedAt._seconds * 1000
              : (t.videoGeneratingStartedAt ?? null),
            story: t.story,
            lyrics: t.lyrics,
            healingBenefits: t.healingBenefits,
            tags: t.tags,
            isPublic: t.isPublic ?? t.is_public ?? false,
            source: t.source,
            generatedVideoImages: t.generatedVideoImages || [],
            userId: t.userId || null,
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

        // Sort: newest first, but satsang tracks always go to the bottom
        uniqueTracks.sort((a, b) => {
          const aIsSatsang = a.source === 'private_satsang';
          const bIsSatsang = b.source === 'private_satsang';
          if (aIsSatsang && !bIsSatsang) return 1;  // a goes after b
          if (!aIsSatsang && bIsSatsang) return -1; // b goes after a
          // Within same group, sort newest first
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        console.log('[My Music] After deduplication and sorting:', uniqueTracks.length);
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

  // Video Generation Handler — uses new AI pipeline (marketing-server)
  // Fire-and-forget: sets state to 'generating' immediately and returns.
  // User clicks "Check Status" to poll for completion.
  const handleGenerateVideo = (trackId: string, trackDocId?: string) => {
    if (!user?.uid) return;

    // Check coin balance (Fail-closed for 300 coins)
    if (coinBalance !== null && coinBalance < 300) {
      setShowBuyCoins(true);
      return;
    }

    const firestoreDocId = (trackDocId || trackId).split('?')[0];
    if (!firestoreDocId) {
      alert('Cannot generate video: Track ID missing');
      return;
    }

    const track = myTracks.find(t => t.id === trackId || t.shareId === trackDocId);
    if (!track?.audioUrl) {
      alert('Cannot generate video: Audio URL missing');
      return;
    }

    // Optimistic UI update — immediately show "Making Video..."
    setMyTracks(prev => prev.map(t =>
      (t.id === trackId || t.shareId === trackDocId) ? { ...t, videoStatus: 'generating' } : t
    ));

    const lyrics = track.lyrics || track.prompt || 'Spiritual divine music, peaceful, meditative';
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const marketingUrl = isLocal
      ? 'http://localhost:4001/video-maker'
      : 'https://satsang-marketing-server-6ougd45dya-el.a.run.app/video-maker';

    // Fire and forget — don't block the UI
    getFirebaseAuth().currentUser?.getIdToken().then(token => {
      fetch(marketingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ audioUrl: track.audioUrl, lyrics, userId: user.uid, trackId: firestoreDocId }),
      })
        .then(res => res.json())
        .then(result => {
          if (result.success && result.videoUrl) {
            setMyTracks(prev => prev.map(t =>
              (t.id === trackId || t.shareId === trackDocId)
                ? { ...t, videoUrl: result.videoUrl, videoStatus: 'completed' }
                : t
            ));
          }
          // If it fails, the user can use "Check Status" or try again
        })
        .catch(e => console.error('Video generation error:', e));
    });
  };

  // Retry Video Handler — clears stale lock so user can try again
  const handleRetryVideo = async (trackId: string, trackDocId?: string) => {
    const firestoreDocId = (trackDocId || trackId).split('?')[0];
    if (!firestoreDocId) return;
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/rraasi-music/video?trackId=${firestoreDocId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.status === 409) {
        alert('This video is still generating — please wait a few more minutes.');
        return;
      }
      if (!res.ok) {
        console.error('Retry failed:', result);
        return;
      }
      // Clear the lock in local state so the card resets to "Create Video"
      setMyTracks(prev => prev.map(t =>
        (t.id === trackId || t.shareId === trackDocId)
          ? { ...t, videoStatus: null, videoGenerating: false, videoGeneratingStartedAt: null }
          : t
      ));
    } catch (e) {
      console.error('Retry error:', e);
    }
  };

  // Delete Video Handler
  const handleDeleteVideo = async (trackId: string, trackDocId?: string) => {
    if (!user?.uid) return;
    const firestoreDocId = (trackDocId || trackId).split('?')[0];
    if (!confirm('Delete this video? The song will remain, only the video will be removed.')) return;

    // Optimistic update
    setMyTracks(prev => prev.map(t =>
      (t.id === trackId || t.shareId === trackDocId) ? { ...t, videoUrl: undefined, videoStatus: null } : t
    ));

    try {
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/rraasi-music/video?trackId=${firestoreDocId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Delete video failed:', err);
        // Revert if the API failed
        await fetchMyMusic(1, true);
      }
    } catch (e) {
      console.error('Delete video error:', e);
    }
  };

  // Download Video Handler
  const handleDownloadVideo = async (track: MusicTrack) => {
    if (!track.videoUrl) return;
    try {
      const response = await fetch(track.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const safeTitle = (track.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${safeTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Video download failed:', e);
      // Fallback: open in new tab
      window.open(track.videoUrl, '_blank');
    }
  };

  // Refresh a single track's video status — no full-collection reload
  const handleRefreshSingleTrack = async (trackId: string, trackDocId?: string) => {
    const firestoreDocId = (trackDocId || trackId).split('?')[0];
    if (!firestoreDocId) return;
    try {
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/rraasi-music/track/${firestoreDocId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Only update this one track in state
      setMyTracks(prev => prev.map(t =>
        (t.id === trackId || t.shareId === trackDocId)
          ? {
              ...t,
              videoUrl: data.videoUrl ?? t.videoUrl,
              videoStatus: t.videoUrl ? 'completed' : (t.videoGenerating ? 'generating' : null),
            }
          : t
      ));
    } catch (e) {
      console.error('Single track refresh failed:', e);
    }
  };

  // Publish Toggle Handler
  const handlePublishToggle = async (trackId: string, newStatus: boolean) => {
    if (!user?.uid) return;

    // Find the track to get the true document ID
    const track = myTracks.find(t => t.id === trackId || t.shareId === trackId);
    if (!track) return;
    
    // The document ID in Firestore is the base ID before any query parameters (like ?v=...)
    const documentId = track.shareId ? track.shareId.split('?')[0] : trackId;

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
        body: JSON.stringify({ trackId: documentId, isPublic: newStatus })
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
    
    // Extract actual document IDs
    const documentIdsToPublish = selectedIds.map(id => {
      const t = myTracks.find(track => track.shareId === id || track.id === id);
      return t?.shareId ? t.shareId.split('?')[0] : id;
    });

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
        body: JSON.stringify({ trackIds: documentIdsToPublish, isPublic: makePublic })
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
    if (activeCategory === 'my-creations') {
        setLoading(false);
        return;
    }

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      // Build API URL with category
      let url = `/api/rraasi-music/community-tracks?page=${pageNum}&limit=30&category=${activeCategory}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

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
            videoStatus: t.videoUrl ? 'completed' : (t.videoGenerating ? 'generating' : (t.videoStatus || null)),
            story: sub.story || t.story,
            lyrics: sub.lyrics || t.lyrics,
            healingBenefits: sub.healingBenefits || t.healingBenefits,
            tags: sub.tags || t.tags,
            generatedVideoImages: t.generatedVideoImages || [],
            userId: t.userId || null,
            isPublic: sub.isPublic ?? t.isPublic ?? false,
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
          videoStatus: t.videoUrl ? 'completed' : (t.videoGenerating ? 'generating' : (t.videoStatus || null)),
          story: t.story,
          lyrics: t.lyrics,
          healingBenefits: t.healingBenefits,
          tags: t.tags,
          generatedVideoImages: t.generatedVideoImages || [],
          userId: t.userId || null,
          isPublic: t.isPublic ?? false,
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
              onClick={() => {
                const gallery = document.getElementById('premium-gallery');
                gallery?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-14 px-8 text-lg font-semibold shadow-xl hover:scale-105 transition-transform bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white"
            >
              Explore Premium Collection
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                const forge = document.getElementById('the-forge');
                forge?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-14 px-8 text-lg font-semibold shadow-xl hover:scale-105 transition-transform bg-gradient-to-r from-amber-500 to-amber-600 border-none"
            >
              Manifest Your Own (50 🪙)
            </Button>
          </div>
        </div>
      </section >

      {/* The Creation Command Center (The Forge) */}
      <section id="the-forge" className="max-w-7xl mx-auto px-4 mt-8 mb-12 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            {isHi ? 'क्या आपको उपयुक्त आध्यात्मिक स्पंदन नहीं मिल रहा? इसे स्वयं प्रकट करें।' : 'Can\'t find the perfect vibration? Manifest it.'}
          </h2>
          <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto">Take control of the AI Director to generate exactly what your soul needs right now.</p>
        </div>
        
        {/* Spiritual Context / Active Remedy Banner */}
        {spiritualState?.currentImbalance && spiritualState?.activeRemedy && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 max-w-3xl mx-auto bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 rounded-full mt-1">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-200 mb-2">Active Spiritual Remedy Recommended</h3>
                <p className="text-amber-100/80 mb-3">
                  Based on your recent <span className="font-semibold text-white">{spiritualState.diagnosingTool}</span> reading diagnosing <span className="italic text-white">"{spiritualState.currentImbalance}"</span>, 
                  your AI Guide recommends manifesting a custom <span className="font-semibold text-white">{spiritualState.activeRemedy}</span> remedy.
                </p>
                {spiritualState.satsangSummary && (
                  <div className="bg-black/30 p-3 rounded-lg border border-amber-500/10 text-sm text-gray-300 italic mb-4">
                    " {spiritualState.satsangSummary} "
                  </div>
                )}
                <Button 
                  onClick={() => {
                    const intention = spiritualState.activeRemedy === 'Music' ? 'generate_music' : 
                                      spiritualState.activeRemedy === 'Reel' ? 'generate_reel' : 'generate_art';
                    
                    if (intention === 'generate_music') {
                      setIsWizardOpen(true);
                    } else {
                      alert("This AI Director is meditating... Coming soon!");
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2 rounded-full border-none shadow-lg shadow-amber-500/20"
                >
                  Manifest {spiritualState.activeRemedy} Remedy (50 🪙)
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => onStartCall({ intention: 'generate_music' })}
            className="bg-black/40 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 group shadow-xl hover:shadow-amber-500/20"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors shadow-inner">
              <Music className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{isHi ? 'संगीत निर्देशक' : 'Music Director'}</h3>
            <p className="text-gray-400 mb-4">{isHi ? 'भक्ति ट्रैक, मंत्र और हीलिंग फ्रीक्वेंसी बनाएँ।' : 'Generate devotional tracks, mantras, and healing frequencies.'}</p>
            <span className="text-amber-500 font-bold bg-amber-500/10 px-4 py-1.5 rounded-full text-sm mt-auto">50 🪙</span>
          </div>
          
          <div 
            onClick={() => setIsReelsStudioOpen(true)}
            className="bg-black/40 backdrop-blur-md border border-orange-500/20 hover:border-orange-500/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 group shadow-xl hover:shadow-orange-500/20"
          >
            <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors shadow-inner">
              <Video className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{isHi ? 'रील्स निर्देशक' : 'Reels Director'}</h3>
            <p className="text-gray-400 mb-4">{isHi ? 'लघु आध्यात्मिक पुष्टि और सोशल मीडिया वीडियो बनाएँ।' : 'Generate short spiritual affirmations and social media videos.'}</p>
            <span className="text-orange-500 font-bold bg-orange-500/10 px-4 py-1.5 rounded-full text-sm mt-auto">50 🪙</span>
          </div>
          
          <div 
            onClick={() => setIsArtStudioOpen(true)}
            className="bg-black/40 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 group shadow-xl hover:shadow-cyan-500/20"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors shadow-inner">
              <ImageIcon className="w-10 h-10 text-cyan-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{isHi ? 'कला निर्देशक' : 'Art Director'}</h3>
            <p className="text-gray-400 mb-4">{isHi ? 'दिव्य चित्र, देवता कला और पवित्र ज्यामिति बनाएँ।' : 'Generate divine imagery, deity art, and sacred geometry.'}</p>
            <span className="text-cyan-500 font-bold bg-cyan-500/10 px-4 py-1.5 rounded-full text-sm mt-auto">30 🪙</span>
          </div>
        </div>
      </section>

      {/* Premium Curated Playlists Section */}
      {curatedPlaylists.length > 0 && (
        <section id="premium-gallery" className="max-w-7xl mx-auto px-4 mt-8 mb-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{isHi ? 'विशेष प्लेलिस्ट' : 'Featured Playlists'}</h2>
              <p className="text-gray-500">{isHi ? 'आपकी आध्यात्मिक यात्रा के लिए दिव्य संग्रह' : 'Divine collections for your spiritual journey'}</p>
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar">
            {curatedPlaylists.map((playlist, idx) => (
              <div 
                key={playlist.id}
                onClick={async () => {
                  if (selectedCuratedPlaylist?.id === playlist.id) {
                    setSelectedCuratedPlaylist(null);
                    return;
                  }
                  
                  setLoadingPlaylistDetails(true);
                  try {
                    const res = await fetch(`/api/playlists/${playlist.id}`);
                    if (res.ok) {
                      const data = await res.json();
                      const tracks = (data.tracks || []).flatMap((t: any) => {
                        // Suno-generated tracks store audio inside t.tracks[] array
                        if (t.tracks && Array.isArray(t.tracks) && t.tracks.length > 0) {
                          return t.tracks
                            .filter((sub: any) => sub.audioUrl || sub.audio_url)
                            .map((sub: any, idx: number) => ({
                              id: sub.sunoId || `${t.id}_${idx}`,
                              title: t.tracks.length > 1 ? `${t.title || 'Untitled'} (${idx + 1})` : (t.title || 'Untitled'),
                              audioUrl: sub.audioUrl || sub.audio_url,
                              imageUrl: sub.imageUrl || sub.sourceImageUrl || t.imageUrl || t.image_url || t.thumbnailUrl,
                              category: t.category,
                              duration: sub.duration || t.duration,
                            }));
                        }
                        // Single track / legacy format
                        const audioUrl = t.audioUrl || t.audio_url;
                        if (!audioUrl) return []; // skip if no audio
                        return [{
                          id: t.id || t.trackId,
                          title: t.title || 'Untitled',
                          audioUrl,
                          imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
                          category: t.category,
                          duration: t.duration,
                        }];
                      });
                      setSelectedCuratedPlaylist({ ...data, tracks });
                    } else {
                      toast.error('Failed to load playlist');
                    }
                  } catch(e) {
                    console.error(e);
                    toast.error('Failed to load playlist');
                  } finally {
                    setLoadingPlaylistDetails(false);
                  }
                }}
                className={`snap-start shrink-0 w-48 md:w-56 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer group border ${selectedCuratedPlaylist?.id === playlist.id ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 ring-2 ring-amber-500 scale-105' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:scale-105'}`}
              >
                <div className="aspect-square w-full relative bg-gray-200 dark:bg-gray-900">
                  {playlist.imageUrl ? (
                    <img src={playlist.imageUrl} alt={playlist.name} className="w-full h-full object-cover" />
                  ) : (
                    <img 
                      src={`https://image.pollinations.ai/prompt/${encodeURIComponent(playlist.name + " beautiful spiritual divine aesthetic high quality")}?width=400&height=400&nologo=true`} 
                      alt={playlist.name} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                  <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${selectedCuratedPlaylist?.id === playlist.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      {selectedCuratedPlaylist?.id === playlist.id ? <ChevronLeft className="w-6 h-6 rotate-90" /> : <ChevronLeft className="w-6 h-6 -rotate-90" />}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{playlist.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 h-8 leading-snug">{playlist.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Playlist Details Area */}
          {loadingPlaylistDetails ? (
            <div className="flex items-center justify-center py-12 mt-4 bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : selectedCuratedPlaylist && (
            <div className="mt-8 animate-in fade-in slide-in-from-top-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6 md:p-8 rounded-3xl border border-amber-500/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
              
              <div className="relative flex flex-col md:flex-row gap-8 mb-8 items-start">
                <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-800">
                  {selectedCuratedPlaylist.imageUrl ? (
                    <img src={selectedCuratedPlaylist.imageUrl} alt={selectedCuratedPlaylist.name} className="w-full h-full object-cover" />
                  ) : (
                    <img 
                      src={`https://image.pollinations.ai/prompt/${encodeURIComponent(selectedCuratedPlaylist.name + " beautiful spiritual divine aesthetic high quality")}?width=400&height=400&nologo=true`} 
                      alt={selectedCuratedPlaylist.name} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full mb-3 uppercase tracking-wider w-max">
                    Featured Playlist
                  </div>
                  <h3 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">{selectedCuratedPlaylist.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 leading-relaxed max-w-2xl">{selectedCuratedPlaylist.description}</p>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => {
                        if (selectedCuratedPlaylist.tracks?.length > 0) {
                          playPlaylist(selectedCuratedPlaylist.tracks, 0);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-2"><path d="M8 5v14l11-7z" /></svg>
                      Play All
                    </Button>
                     <Button
                      variant="outline"
                      onClick={async () => {
                        const url = `${window.location.origin}/playlist/${selectedCuratedPlaylist.id}`;
                        // Try native share API first (works great on mobile)
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: selectedCuratedPlaylist.name || 'RRAASI Playlist',
                              text: 'Listen to this spiritual playlist on RRAASI',
                              url,
                            });
                          } catch { /* user cancelled */ }
                        } else {
                          // Fallback: copy to clipboard
                          try {
                            await navigator.clipboard.writeText(url);
                          } catch {
                            // Last resort: prompt
                            window.prompt('Copy this link:', url);
                          }
                          setPlaylistLinkCopied(true);
                          setTimeout(() => setPlaylistLinkCopied(false), 2500);
                        }
                      }}
                      className="rounded-full border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      {playlistLinkCopied ? '✓ Copied!' : 'Share'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCuratedPlaylist(null)}
                      className="rounded-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white text-xl mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {isHi ? 'ट्रैक्स' : 'Tracks'} ({selectedCuratedPlaylist.tracks?.length || 0})
                </h4>
                
                {selectedCuratedPlaylist.tracks?.length === 0 ? (
                  <p className="text-gray-500 py-4 text-center">No tracks available in this playlist.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCuratedPlaylist.tracks?.map((track: any, index: number) => (
                      <MusicPlayerCard
                        key={track.id}
                        id={track.id}
                        shareId={track.shareId}
                        title={track.title || 'Untitled'}
                        audioUrl={track.audioUrl}
                        imageUrl={track.imageUrl || selectedCuratedPlaylist.imageUrl}
                        category={track.category || 'other'}
                        onPlay={() => playPlaylist(selectedCuratedPlaylist.tracks, index)}
                        isFavorite={isFavorite(track.id)}
                        onToggleFavorite={() => toggleFavorite(track.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Recent Chats Section */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <RecentChatsSection />
      </section>

      {/* My Vault (My Music Section) */}
      <section className="max-w-7xl mx-auto px-4 mt-8 mb-8">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <div 
            className="px-6 py-4 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setShowMyVault(!showMyVault)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <Headphones className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{isHi ? 'मेरी रचनाएं' : 'My Creations'}</h2>
            </div>
            <button 
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              {showMyVault ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              )}
            </button>
          </div>
          
          <AnimatePresence>
            {showMyVault && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-8">
            {/* Header: title + coin balance stack properly on mobile */}
        <div className="flex flex-col gap-3 mb-8">
          {/* Row 1: title + coins */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-2xl shrink-0">
                <Headphones className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {isHi ? 'मेरा स्टूडियो' : 'My Studio'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg hidden sm:block">
                  Your personal spiritual creations
                </p>
              </div>
            </div>

            {/* Coin Balance + Buy Coins — always visible on the right */}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                {payoutBalance !== null && payoutBalance > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <span className="font-semibold text-sm">Payout: {payoutBalance} 🪙</span>
                  </div>
                )}
                {coinBalance !== null && (
                  <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/20">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">{coinBalance}</span>
                  </div>
                )}
                <Button 
                  onClick={() => setShowBuyCoins(true)}
                  variant="outline"
                  className="bg-amber-500 hover:bg-amber-600 text-white border-none shadow-md shadow-amber-500/20"
                >
                  Buy Coins
                </Button>
              </div>
            )}
          </div>

          {/* Row 2: Action buttons — scrollable on mobile, wrap on desktop */}
          {isAuthenticated && (
            <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide flex-nowrap sm:flex-wrap">
              {selectionMode && selectedTracks.size > 0 && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleBulkPublish(true)}
                    className="bg-green-600 hover:bg-green-700 text-white border-none shadow-md gap-1 shrink-0"
                  >
                    <Globe className="w-4 h-4" /> <span className="hidden sm:inline">Make </span>Public ({selectedTracks.size})
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleBulkPublish(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white border-none shadow-md gap-1 shrink-0"
                  >
                    <Lock className="w-4 h-4" /> <span className="hidden sm:inline">Make </span>Private ({selectedTracks.size})
                  </Button>
                </>
              )}

              {/* Select Tracks */}
              <Button
                variant={selectionMode ? "primary" : "dotted"}
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedTracks(new Set());
                }}
                className={`shrink-0 ${selectionMode ? "bg-amber-500 hover:bg-amber-600 border-none text-white shadow-md" : "text-amber-500 border-amber-500/20 hover:bg-amber-500/10"}`}
              >
                {selectionMode ? "Cancel" : <><span className="sm:hidden">Select</span><span className="hidden sm:inline">Select Tracks</span></>}
              </Button>

              {/* Distribute to YouTube */}
              {!selectionMode && (
                <Button
                  variant="primary"
                  onClick={() => window.location.href = '/business/creators/music/distribution'}
                  className="text-white bg-amber-600 hover:bg-amber-700 shadow-md border-none shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span className="ml-1.5 hidden sm:inline">Distribute</span>
                  <span className="ml-1.5 hidden lg:inline"> to YouTube</span>
                </Button>
              )}

              {/* Refresh — icon only on mobile */}
              {!selectionMode && (
                <Button
                  variant="dotted"
                  onClick={() => fetchMyMusic(1, true)}
                  disabled={myTracksLoading}
                  className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10 shrink-0"
                  title="Refresh My Music"
                >
                  <RefreshCw className={`w-4 h-4 ${myTracksLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline ml-1.5">Refresh</span>
                </Button>
              )}

              {/* Session Recordings — icon only on mobile */}
              <Button
                variant="dotted"
                onClick={() => setShowRecordings(true)}
                className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10 shrink-0"
                title="Session Recordings"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Recordings</span>
              </Button>

              {/* Recent Chats */}
              <Button
                variant="dotted"
                onClick={() => setShowRecentChats(true)}
                className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10 shrink-0"
                title="Recent Chats"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Recent Chats</span>
              </Button>

              {/* Manifest from Reading */}
              <Button
                variant="dotted"
                onClick={() => setShowReadingModal(true)}
                className="text-purple-400 border-purple-500/20 hover:bg-purple-500/10 shrink-0 font-bold"
                title="Manifest from Reading"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Manifest from Reading</span>
              </Button>

              {/* Shuffle All — hidden on small screens */}
              {myTracks.length > 5 && (
                <Button
                  variant="dotted"
                  onClick={handleDailyMix}
                  disabled={isShuffling}
                  className="hidden md:flex text-amber-500 border-amber-500/20 hover:bg-amber-500/10 shrink-0"
                >
                  {isShuffling ? (
                    <span className="w-4 h-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  ) : (
                    <Shuffle className="w-4 h-4" />
                  )}
                  <span className="ml-1.5">Shuffle All</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Two-column layout: Tracks + Playlist Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main tracks grid */}
          <div className="flex-1">
            {/* My Music sub-filter: All / Favorites / Satsang */}
            {isAuthenticated && !authLoading && !myTracksLoading && (
              <div className="flex gap-2 mb-5 flex-wrap">
                <button
                  onClick={() => setMyMusicFilter('all')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                    myMusicFilter === 'all'
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  🎵 My Creations
                </button>
                <button
                  onClick={() => setMyMusicFilter('favorites')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                    myMusicFilter === 'favorites'
                      ? "bg-rose-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  ❤️ Favorites
                  {favoriteIds.size > 0 && (
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-full",
                      myMusicFilter === 'favorites' ? "bg-white/30 text-white" : "bg-rose-100 dark:bg-rose-900/40 text-rose-600"
                    )}>
                      {Array.from(favoriteIds).filter(id => myTracks.some(t => t.id === id)).length}
                    </span>
                  )}
                </button>
                {myTracks.some(t => t.source === 'private_satsang') && (
                  <button
                    onClick={() => setMyMusicFilter('satsang')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                      myMusicFilter === 'satsang'
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800/40"
                    )}
                  >
                    🕉️ Satsang Music
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-full",
                      myMusicFilter === 'satsang' ? "bg-white/30 text-white" : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                    )}>
                      {myTracks.filter(t => t.source === 'private_satsang').length}
                    </span>
                  </button>
                )}
              </div>
            )}
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
                <Button onClick={() => setIsWizardOpen(true)} variant="outline" size="lg" className="border-amber-500 text-amber-600 hover:bg-amber-50">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Spiritual Track
                </Button>
              </div>
            ) : (() => {
                const displayedTracks = myMusicFilter === 'favorites'
                  ? myTracks.filter(t => isFavorite(t.id))
                  : myMusicFilter === 'satsang'
                  ? myTracks.filter(t => t.source === 'private_satsang')
                  : myTracks.filter(t => t.source !== 'private_satsang');
                  
                const paginatedTracks = displayedTracks.slice(0, visibleMyMusicCount);

                if (displayedTracks.length === 0 && myMusicFilter === 'favorites') {
                  return (
                    <div className="text-center py-16 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20">
                      <Heart className="w-12 h-12 text-rose-300 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">No favorites in My Music yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Tap the ❤️ on any of your tracks to add it here.</p>
                    </div>
                  );
                }
                if (displayedTracks.length === 0 && myMusicFilter === 'satsang') {
                  return (
                    <div className="text-center py-16 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                      <p className="text-4xl mb-3">🕉️</p>
                      <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">No Satsang music yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Music generated during your Satsang sessions will appear here.</p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {paginatedTracks.map((track, index) => (
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
                          onPlay={() => playPlaylist(paginatedTracks, index)}
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
                          onDeleteVideo={() => handleDeleteVideo(track.id, track.shareId)}
                          onDownloadVideo={track.videoUrl ? () => handleDownloadVideo(track) : undefined}
                          onRefreshVideo={() => handleRefreshSingleTrack(track.id, track.shareId)}
                          onRetryVideo={() => handleRetryVideo(track.id, track.shareId)}
                          videoGeneratingStartedAt={track.videoGeneratingStartedAt}
                          onSync={() => handleSync(track.id)}
                          isSyncing={syncingTrackId === track.id}
                          onDownload={() => handleDownload(track)}
                          isFavorite={isFavorite(track.id)}
                          onToggleFavorite={() => toggleFavorite(track.id)}
                          source={track.source}
                          generatedVideoImages={track.generatedVideoImages}
                          trackOwnerId={track.userId || user?.uid}
                          onShowBuyCoins={() => setShowBuyCoins(true)}
                        />
                      ))}
                    </div>
                    {displayedTracks.length > visibleMyMusicCount && (
                      <div className="flex justify-center mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setVisibleMyMusicCount(prev => prev + 6)}
                          className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-8 py-2 rounded-full"
                        >
                          Load More My Music
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
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
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  </div>
</section>

      {/* Category Tabs & Music Grid */}
      <section className="max-w-7xl mx-auto px-4 mt-16" >
            {/* Browse Header */}
        < div className="text-center mb-8" >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mt('browse.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            {mt('browse.subtitle')}
          </p>
          
          <SearchBar onSearch={(term) => setSearchQuery(term)} initialValue={searchQuery} />
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
        </div >

        {/* Music Content - Grid, Favorites, or Playlists */}
        {
          activeCategory === 'favorites' ? (
            isAuthenticated ? (
              loadingFavorites ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-64 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : favoriteTracks.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
                  <Heart className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 text-lg mb-2">No favorites yet!</p>
                  <p className="text-zinc-600 text-sm">Tap the ❤️ on any track to save it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {favoriteTracks.map((track, index) => (
                    <MusicPlayerCard
                      key={track.id}
                      id={track.id}
                      title={track.title}
                      audioUrl={track.audioUrl}
                      imageUrl={track.imageUrl}
                      category={track.category}
                      prompt={track.prompt}
                      description={track.description}
                      createdAt={track.createdAt}
                      story={track.story}
                      lyrics={track.lyrics}
                      healingBenefits={track.healingBenefits}
                      tags={track.tags}
                      shareId={track.shareId}
                      onPlay={() => playPlaylist(favoriteTracks, index)}
                      isFavorite={true}
                      onToggleFavorite={async () => {
                        await toggleFavorite(track.id);
                        setFavoriteTracks(prev => prev.filter(t => t.id !== track.id));
                      }}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-20 text-zinc-500">
                <p>Please log in to view your favorites.</p>
              </div>
            )
          ) : activeCategory === 'playlists' ? (
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
              <Button onClick={() => setIsWizardOpen(true)} variant="primary" disabled={authLoading}>
                <Plus className="w-5 h-5 mr-2" />
                {mt('startButton')}
              </Button>
            </div>
          ) : (
            <>
              {activeCategory === 'all' || activeCategory === 'my-creations' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <CommunityArtGallery
                    musicTracks={activeCategory === 'all' ? (musicTracks as any[]).filter(t => (t as any).isPublic) : []}
                    onOpenArtStudio={() => setIsArtStudioOpen(true)}
                    fetchUrl={activeCategory === 'my-creations' ? '/api/user/creations?limit=50' : '/api/art/community?limit=24'}
                  />
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
                        imageUrl={track.imageUrl}
                        category={track.category || 'other'}
                        prompt={track.prompt}
                        description={track.description}
                        metadata={track.metadata}
                        createdAt={track.createdAt?.toDate?.()?.toISOString() || track.createdAt || new Date().toISOString()}
                        videoUrl={track.videoUrl}
                        videoStatus={track.videoStatus}
                        onPlay={() => playPlaylist(musicTracks, index)}
                        isFavorite={isFavorite(track.id)}
                        onToggleFavorite={() => toggleFavorite(track.id)}
                        generatedVideoImages={(track as any).generatedVideoImages}
                        trackOwnerId={(track as any).userId}
                        isPublic={(track as any).isPublic}
                        isOwner={user?.uid === (track as any).userId}
                        onSync={() => { setPage(1); fetchMusic(1, true); }}
                        onShowBuyCoins={() => setShowBuyCoins(true)}
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
              )}
            </>
          )
        }
      </section>



      {/* Explore More RRAASI Services */}
      <section className="max-w-7xl mx-auto px-4 mt-16 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {isHi ? 'RRAASI से और अन्वेषण करें' : 'Explore More from RRAASI'}
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
              {isHi ? 'AI सत्संग' : 'AI Satsang'}
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
              {isHi ? 'रहस्यमय टैरो' : 'Mystic Tarot'}
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
              {isHi ? 'वैदिक ज्योतिष' : 'Vedic Astrology'}
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

      <RecentChatsModal
        isOpen={showRecentChats}
        onClose={() => setShowRecentChats(false)}
      />

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showBuyCoins}
        onClose={() => setShowBuyCoins(false)}
        currentBalance={coinBalance ?? 0}
        onCoinsAdded={(newBalance) => {
          setCoinBalance(newBalance);
          setShowBuyCoins(false);
        }}
      />

      {/* Floating Create Button (Mobile) */}
      <button
        onClick={() => setIsWizardOpen(true)}
        disabled={authLoading}
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all duration-200 z-40 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Create music - 50 coins"
        title="Create music - 50 coins"
      >
        <Plus className="w-7 h-7" />
      </button>



      {/* Spiritual Art Studio Modal */}
      <SpiritualArtStudio
        isOpen={isArtStudioOpen}
        onClose={() => setIsArtStudioOpen(false)}
        onShowBuyCoins={() => {
          setIsArtStudioOpen(false);
          setShowBuyCoins(true);
        }}
      />
      {/* Reels Studio Modal */}
      <SpiritualReelsStudio
        isOpen={isReelsStudioOpen}
        onClose={() => setIsReelsStudioOpen(false)}
        onShowBuyCoins={() => {
          setIsReelsStudioOpen(false);
          setShowBuyCoins(true);
        }}
      />
      {/* Manifest from Reading Modal */}
      <ReadingToMusicModal
        isOpen={showReadingModal}
        onClose={() => setShowReadingModal(false)}
        onSuccess={() => {
          setShowReadingModal(false);
          setTimeout(() => fetchMyMusic(1, true), 1500);
        }}
      />
    </div>
  );
};
