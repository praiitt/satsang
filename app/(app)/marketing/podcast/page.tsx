'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/livekit/button';
import { getCurrentUser } from '@/lib/auth-api';

type SpeakerRole = 'host' | 'guest';

interface TurnInput {
  speaker: SpeakerRole;
  text: string;
}

interface TurnStatus extends TurnInput {
  index: number;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  heygenVideoId?: string;
  videoUrl?: string;
}

interface PodcastJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  hostAvatarId: string;
  guestAvatarId: string;
  turns: TurnStatus[];
}

const PODCAST_API_BASE = '/api/marketing/podcast';

export default function MarketingPodcastPage() {
  // Pre-fill with working talking photo ID and voice ID
  const DEFAULT_TALKING_PHOTO_ID = 'f31ce977d65e47caa3e92a46703d6b1f';
  const DEFAULT_VOICE_ID = 'dc5370c68baa4905be87f702758df4b0';
  
  const [hostAvatarId, setHostAvatarId] = useState(DEFAULT_TALKING_PHOTO_ID);
  const [guestAvatarId, setGuestAvatarId] = useState(DEFAULT_TALKING_PHOTO_ID);
  const [hostVoiceId, setHostVoiceId] = useState(DEFAULT_VOICE_ID);
  const [guestVoiceId, setGuestVoiceId] = useState(DEFAULT_VOICE_ID);
  const [turns, setTurns] = useState<TurnInput[]>([
    { speaker: 'host', text: 'नमस्ते! आज के satsang podcast में आपका स्वागत है।' },
    { speaker: 'guest', text: 'धन्यवाद! यहाँ आकर बहुत अच्छा लग रहा है।' },
  ]);
  const [job, setJob] = useState<PodcastJobResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [editingUrlIndex, setEditingUrlIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [talkingPhotos, setTalkingPhotos] = useState<Array<{ id: string; name: string; isPublic?: boolean; type?: string }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [hostPhotoFilter, setHostPhotoFilter] = useState<string>(''); // 'all', 'my', 'public'
  const [guestPhotoFilter, setGuestPhotoFilter] = useState<string>(''); // 'all', 'my', 'public'
  const [voices, setVoices] = useState<Array<{ id: string; name: string; language?: string; gender?: string; previewAudio?: string }>>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [hostLanguageFilter, setHostLanguageFilter] = useState<string>('');
  const [hostGenderFilter, setHostGenderFilter] = useState<string>('');
  const [guestLanguageFilter, setGuestLanguageFilter] = useState<string>('');
  const [guestGenderFilter, setGuestGenderFilter] = useState<string>('');
  const [isStitching, setIsStitching] = useState(false);
  const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);
  // Separate video stitching state
  const [stitchVideoUrls, setStitchVideoUrls] = useState<string[]>(['']);
  const [stitchVideoFiles, setStitchVideoFiles] = useState<(File | null)[]>([null]); // Start with one file slot
  const [isStitchingStandalone, setIsStitchingStandalone] = useState(false);
  const [standaloneStitchedUrl, setStandaloneStitchedUrl] = useState<string | null>(null);

  const handleAddTurn = () => {
    const lastSpeaker = turns[turns.length - 1]?.speaker ?? 'guest';
    const nextSpeaker: SpeakerRole = lastSpeaker === 'host' ? 'guest' : 'host';
    setTurns((prev) => [...prev, { speaker: nextSpeaker, text: '' }]);
  };

  const handleUpdateTurn = (index: number, patch: Partial<TurnInput>) => {
    setTurns((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t))
    );
  };

  const handleRemoveTurn = (index: number) => {
    setTurns((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (!hostAvatarId.trim() || !guestAvatarId.trim()) {
      return 'Host and guest avatar IDs are required.';
    }
    if (!turns.length || turns.some((t) => !t.text.trim())) {
      return 'All turns must have non-empty text.';
    }
    return null;
  };

  const createJob = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure user is logged in (will throw if not)
      await getCurrentUser().catch(() => {
        throw new Error('You must be logged in to create a podcast job.');
      });

      const res = await fetch(PODCAST_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hostAvatarId: hostAvatarId.trim(),
          guestAvatarId: guestAvatarId.trim(),
          turns: turns.map((t) => ({
            speaker: t.speaker,
            text: t.text.trim(),
          })),
          options: {
            voiceIdHost: hostVoiceId.trim() || undefined,
            voiceIdGuest: guestVoiceId.trim() || undefined,
          },
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(
          data?.error || data?.details || 'Failed to create podcast job'
        );
      }

      const jobData: PodcastJobResponse = {
        jobId: data.jobId,
        status: data.status,
        hostAvatarId: hostAvatarId.trim(),
        guestAvatarId: guestAvatarId.trim(),
        turns: data.turns,
      };

      setJob(jobData);
      // Start polling for status
      void pollJob(jobData.jobId);
    } catch (err: any) {
      setError(err?.message || 'Failed to create podcast job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollJob = async (jobId: string) => {
    if (!jobId) return;
    setIsPolling(true);

    try {
      let currentStatus: PodcastJobResponse['status'] = 'queued';

      while (currentStatus === 'queued' || currentStatus === 'processing') {
        const res = await fetch(`${PODCAST_API_BASE}/${jobId}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = (await res.json()) as any;
        if (!res.ok) {
          throw new Error(
            data?.error || data?.details || 'Failed to fetch podcast status'
          );
        }

        const jobData: PodcastJobResponse = {
          jobId: data.jobId,
          status: data.status,
          hostAvatarId: data.hostAvatarId,
          guestAvatarId: data.guestAvatarId,
          turns: data.turns,
        };
        setJob(jobData);
        currentStatus = jobData.status;

        if (currentStatus === 'ready' || currentStatus === 'failed') {
          break;
        }

        // Wait 3 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to poll podcast status');
    } finally {
      setIsPolling(false);
    }
  };

  const updateVideoUrl = async (turnIndex: number, videoUrl: string) => {
    if (!job) return;
    
    try {
      const res = await fetch(`${PODCAST_API_BASE}/${job.jobId}/${turnIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update video URL');
      }

      // Refresh job status
      await pollJob(job.jobId);
      setEditingUrlIndex(null);
      setUrlInput('');
    } catch (err: any) {
      setError(err?.message || 'Failed to update video URL');
    }
  };

  const handleEditUrl = (turnIndex: number, currentUrl?: string) => {
    setEditingUrlIndex(turnIndex);
    setUrlInput(currentUrl || '');
  };

  const handleCancelEdit = () => {
    setEditingUrlIndex(null);
    setUrlInput('');
  };

  const fetchTalkingPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const res = await fetch('/api/marketing/podcast/talking-photos');
      const data = await res.json();
      if (res.ok && data.talkingPhotos) {
        setTalkingPhotos(data.talkingPhotos);
      } else {
        console.error('Failed to fetch talking photos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching talking photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const fetchVoices = async () => {
    setLoadingVoices(true);
    try {
      const res = await fetch('/api/marketing/podcast/voices');
      const data = await res.json();
      console.log('[fetchVoices] Response:', { ok: res.ok, status: res.status, voicesCount: data.voices?.length, error: data.error });
      if (res.ok && data.voices) {
        setVoices(data.voices);
        console.log(`[fetchVoices] Loaded ${data.voices.length} voices`);
      } else {
        console.error('[fetchVoices] Failed to fetch voices:', data.error || 'Unknown error');
        // Still set empty array so UI doesn't break
        setVoices([]);
      }
    } catch (error) {
      console.error('[fetchVoices] Error fetching voices:', error);
      setVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  const previewVoice = async (voiceId: string, isHost: boolean) => {
    setPreviewingVoice(voiceId);
    try {
      // First, try to use preview_audio if available (instant preview)
      const voice = voices.find((v) => v.id === voiceId);
      if (voice?.previewAudio) {
        // Play the preview audio directly
        const audio = new Audio(voice.previewAudio);
        audio.onended = () => {
          setPreviewingVoice(null);
        };
        audio.onerror = () => {
          console.error('Error playing preview audio');
          setPreviewingVoice(null);
          // Fallback to video generation
          generatePreviewVideo(voiceId);
        };
        await audio.play();
        // Keep previewingVoice set while audio is playing
        return;
      }

      // Fallback: generate a preview video
      await generatePreviewVideo(voiceId);
    } catch (error: any) {
      console.error('Error in previewVoice:', error);
      setPreviewingVoice(null);
      // Try fallback video generation
      await generatePreviewVideo(voiceId);
    }
  };

  const generatePreviewVideo = async (voiceId: string) => {
    try {
      const res = await fetch('/api/marketing/podcast/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          text: 'नमस्ते, यह एक आवाज़ का पूर्वावलोकन है।', // Hindi preview text
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Preview video is being generated! Video ID: ${data.videoId}\n\nCheck your HeyGen dashboard to see the preview video.`);
      } else {
        alert(`Failed to create preview: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setPreviewingVoice(null);
    }
  };

  const handleStitchVideos = async () => {
    if (!job) return;

    const readyTurns = job.turns.filter((t) => t.videoUrl && t.status === 'ready');
    if (readyTurns.length === 0) {
      alert('No ready videos to stitch. Please add video URLs first.');
      return;
    }

    setIsStitching(true);
    try {
      const res = await fetch(`/api/marketing/podcast/${job.jobId}/stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStitchedVideoUrl(data.outputUrl);
        alert(`✅ Videos stitched successfully! ${data.videoCount} videos combined.\n\nOutput: ${data.outputPath}`);
        // Refresh job to get updated stitchedVideoUrl
        await pollJob(job.jobId);
      } else {
        alert(`Failed to stitch videos: ${data.error || data.details || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsStitching(false);
    }
  };

  const handleAddStitchUrl = () => {
    setStitchVideoUrls([...stitchVideoUrls, '']);
  };

  const handleRemoveStitchUrl = (index: number) => {
    const newUrls = stitchVideoUrls.filter((_, i) => i !== index);
    setStitchVideoUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const handleUpdateStitchUrl = (index: number, url: string) => {
    const newUrls = [...stitchVideoUrls];
    newUrls[index] = url;
    setStitchVideoUrls(newUrls);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFiles = [...stitchVideoFiles];
      newFiles[index] = file;
      setStitchVideoFiles(newFiles);
    }
  };

  const handleAddFileSlot = () => {
    setStitchVideoFiles([...stitchVideoFiles, null]);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = stitchVideoFiles.filter((_, i) => i !== index);
    setStitchVideoFiles(newFiles);
  };

  const handleStitchStandalone = async () => {
    const validUrls = stitchVideoUrls.filter((url) => url.trim().length > 0);
      const validFiles = stitchVideoFiles.filter((file): file is File => file != null);
    
    if (validUrls.length === 0 && validFiles.length === 0) {
      alert('Please add at least one video URL or upload a video file to stitch.');
      return;
    }

    if (validUrls.length + validFiles.length < 2) {
      alert('Please add at least 2 videos (URLs or files) to stitch them together.');
      return;
    }

    setIsStitchingStandalone(true);
    try {
      // If we have files, upload them first and get their URLs
      let fileUrls: string[] = [];
      if (validFiles.length > 0) {
        const formData = new FormData();
        validFiles.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });

        const uploadRes = await fetch('/api/marketing/video-stitch/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json();
          throw new Error(uploadError.error || 'Failed to upload files');
        }

        const uploadData = await uploadRes.json();
        fileUrls = uploadData.urls || [];
      }

      // Combine file URLs with direct URLs
      const allUrls = [...fileUrls, ...validUrls];

      const res = await fetch('/api/marketing/video-stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls: allUrls }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStandaloneStitchedUrl(data.outputUrl);
        alert(`✅ Videos stitched successfully! ${data.videoCount} videos combined.\n\nOutput: ${data.outputPath}`);
        // Clear files after successful stitch
        setStitchVideoFiles([]);
        setStitchVideoUrls(['']);
      } else {
        const errorMsg = data.details || data.error || 'Unknown error';
        console.error('[stitch] Error details:', data);
        alert(`Failed to stitch videos:\n\n${errorMsg}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsStitchingStandalone(false);
    }
  };

  // Fetch talking photos and voices on mount
  useEffect(() => {
    fetchTalkingPhotos();
    fetchVoices();
  }, []);

  // Get unique languages and genders from voices
  const uniqueLanguages = Array.from(new Set(voices.map((v) => v.language).filter(Boolean))).sort();
  const uniqueGenders = Array.from(new Set(voices.map((v) => v.gender).filter(Boolean))).sort();

  // Filter voices based on selected filters
  const getFilteredVoices = (languageFilter: string, genderFilter: string) => {
    return voices.filter((voice) => {
      const matchesLanguage = !languageFilter || voice.language === languageFilter;
      const matchesGender = !genderFilter || voice.gender?.toLowerCase() === genderFilter.toLowerCase();
      return matchesLanguage && matchesGender;
    });
  };

  const filteredHostVoices = getFilteredVoices(hostLanguageFilter, hostGenderFilter);
  const filteredGuestVoices = getFilteredVoices(guestLanguageFilter, guestGenderFilter);

  // Filter talking photos based on selected filter
  const getFilteredPhotos = (filter: string) => {
    if (filter === 'my') {
      return talkingPhotos.filter((photo) => !photo.isPublic);
    } else if (filter === 'public') {
      return talkingPhotos.filter((photo) => photo.isPublic);
    }
    return talkingPhotos; // 'all' or empty
  };

  const filteredHostPhotos = getFilteredPhotos(hostPhotoFilter);
  const filteredGuestPhotos = getFilteredPhotos(guestPhotoFilter);

  const playSequence = () => {
    if (!job) return;
    const readyTurns = job.turns.filter((t) => t.videoUrl && t.status === 'ready');
    if (readyTurns.length === 0) return;

    setIsPlayingSequence(true);
    setCurrentPlayingIndex(0);
  };

  const handleVideoEnd = (index: number) => {
    if (!job || !isPlayingSequence) return;
    
    const readyTurns = job.turns.filter((t) => t.videoUrl && t.status === 'ready');
    const currentIndex = readyTurns.findIndex((t) => t.index === index);
    
    if (currentIndex < readyTurns.length - 1) {
      // Play next video
      setCurrentPlayingIndex(currentIndex + 1);
    } else {
      // All videos played
      setIsPlayingSequence(false);
      setCurrentPlayingIndex(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          Marketing Podcast (HeyGen Talking Photos)
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Create a two-avatar podcast conversation using HeyGen talking photo avatars.
          Configure host and guest talking photo IDs, write their dialogue, and generate
          video clips that you can stitch into a podcast-style video. Uses the working
          HeyGen API format with 720p resolution.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 md:gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Talking Photo Avatars & Voices</h2>
          <p className="text-muted-foreground text-xs">
            Use HeyGen talking photo IDs and voice IDs. Defaults are pre-filled with working IDs.
            Videos are generated in 720p format (free plan compatible).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
                Host Talking Photo
                <div className="mt-1 space-y-1">
                  <select
                    value={hostPhotoFilter}
                    onChange={(e) => {
                      setHostPhotoFilter(e.target.value);
                      setHostAvatarId(DEFAULT_TALKING_PHOTO_ID); // Reset photo when filter changes
                    }}
                    className="w-full rounded-md border px-2 py-1 text-xs"
                  >
                    <option value="">All Photos</option>
                    <option value="my">My Moving Photos</option>
                    <option value="public">Public Photos</option>
                  </select>
                  <select
                    value={hostAvatarId}
                    onChange={(e) => setHostAvatarId(e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    disabled={loadingPhotos}
                  >
                    <option value={DEFAULT_TALKING_PHOTO_ID}>
                      {loadingPhotos
                        ? 'Loading...'
                        : filteredHostPhotos.length === 0
                          ? 'No photos match filter'
                          : `Select photo (${filteredHostPhotos.length} available)...`}
                    </option>
                    {filteredHostPhotos.map((photo) => (
                      <option key={photo.id} value={photo.id}>
                        {photo.name} ({photo.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              <input
                type="text"
                value={hostAvatarId}
                onChange={(e) => setHostAvatarId(e.target.value)}
                  placeholder="Or type talking photo ID..."
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm font-mono text-xs"
                />
              </label>
              <label className="text-sm font-medium">
                Host Voice
                <div className="mt-1 space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={hostLanguageFilter}
                      onChange={(e) => {
                        setHostLanguageFilter(e.target.value);
                        setHostVoiceId(DEFAULT_VOICE_ID); // Reset voice when filter changes
                      }}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      <option value="">All Languages</option>
                      {uniqueLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    <select
                      value={hostGenderFilter}
                      onChange={(e) => {
                        setHostGenderFilter(e.target.value);
                        setHostVoiceId(DEFAULT_VOICE_ID); // Reset voice when filter changes
                      }}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      <option value="">All Genders</option>
                      {uniqueGenders.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={hostVoiceId}
                      onChange={(e) => setHostVoiceId(e.target.value)}
                      className="flex-1 rounded-md border px-2 py-1 text-xs"
                      disabled={loadingVoices}
                    >
                      <option value={DEFAULT_VOICE_ID}>
                        {loadingVoices
                          ? 'Loading...'
                          : filteredHostVoices.length === 0
                            ? 'No voices match filters'
                            : `Select voice (${filteredHostVoices.length} available)...`}
                      </option>
                      {filteredHostVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} {voice.language ? `(${voice.language})` : ''} {voice.gender ? `[${voice.gender}]` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => previewVoice(hostVoiceId, true)}
                      disabled={!hostVoiceId || previewingVoice === hostVoiceId}
                      className="text-xs px-2"
                      title="Preview voice"
                    >
                      {previewingVoice === hostVoiceId ? '⏳' : '▶️'}
                    </Button>
                  </div>
                </div>
                <input
                  type="text"
                  value={hostVoiceId}
                  onChange={(e) => setHostVoiceId(e.target.value)}
                  placeholder="Or type voice ID..."
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm font-mono text-xs"
              />
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
                Guest Talking Photo
                <div className="mt-1 space-y-1">
                  <select
                    value={guestPhotoFilter}
                    onChange={(e) => {
                      setGuestPhotoFilter(e.target.value);
                      setGuestAvatarId(DEFAULT_TALKING_PHOTO_ID); // Reset photo when filter changes
                    }}
                    className="w-full rounded-md border px-2 py-1 text-xs"
                  >
                    <option value="">All Photos</option>
                    <option value="my">My Moving Photos</option>
                    <option value="public">Public Photos</option>
                  </select>
                  <select
                    value={guestAvatarId}
                    onChange={(e) => setGuestAvatarId(e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    disabled={loadingPhotos}
                  >
                    <option value={DEFAULT_TALKING_PHOTO_ID}>
                      {loadingPhotos
                        ? 'Loading...'
                        : filteredGuestPhotos.length === 0
                          ? 'No photos match filter'
                          : `Select photo (${filteredGuestPhotos.length} available)...`}
                    </option>
                    {filteredGuestPhotos.map((photo) => (
                      <option key={photo.id} value={photo.id}>
                        {photo.name} ({photo.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              <input
                type="text"
                value={guestAvatarId}
                onChange={(e) => setGuestAvatarId(e.target.value)}
                  placeholder="Or type talking photo ID..."
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm font-mono text-xs"
                />
              </label>
              <label className="text-sm font-medium">
                Guest Voice
                <div className="mt-1 space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={guestLanguageFilter}
                      onChange={(e) => {
                        setGuestLanguageFilter(e.target.value);
                        setGuestVoiceId(DEFAULT_VOICE_ID); // Reset voice when filter changes
                      }}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      <option value="">All Languages</option>
                      {uniqueLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    <select
                      value={guestGenderFilter}
                      onChange={(e) => {
                        setGuestGenderFilter(e.target.value);
                        setGuestVoiceId(DEFAULT_VOICE_ID); // Reset voice when filter changes
                      }}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      <option value="">All Genders</option>
                      {uniqueGenders.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={guestVoiceId}
                      onChange={(e) => setGuestVoiceId(e.target.value)}
                      className="flex-1 rounded-md border px-2 py-1 text-xs"
                      disabled={loadingVoices}
                    >
                      <option value={DEFAULT_VOICE_ID}>
                        {loadingVoices
                          ? 'Loading...'
                          : filteredGuestVoices.length === 0
                            ? 'No voices match filters'
                            : `Select voice (${filteredGuestVoices.length} available)...`}
                      </option>
                      {filteredGuestVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} {voice.language ? `(${voice.language})` : ''} {voice.gender ? `[${voice.gender}]` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => previewVoice(guestVoiceId, false)}
                      disabled={!guestVoiceId || previewingVoice === guestVoiceId}
                      className="text-xs px-2"
                      title="Preview voice"
                    >
                      {previewingVoice === guestVoiceId ? '⏳' : '▶️'}
                    </Button>
                  </div>
                </div>
                <input
                  type="text"
                  value={guestVoiceId}
                  onChange={(e) => setGuestVoiceId(e.target.value)}
                  placeholder="Or type voice ID..."
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm font-mono text-xs"
              />
            </label>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {talkingPhotos.length > 0 && (
              <span>✅ {talkingPhotos.length} talking photos</span>
            )}
            {voices.length > 0 && (
              <span>✅ {voices.length} voices</span>
            )}
          </div>
          {talkingPhotos.length > 0 && voices.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Select from dropdowns or type IDs manually. Click ▶️ to preview voices.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Actions</h2>
          <Button
            onClick={createJob}
            disabled={isSubmitting || isPolling}
            className="w-full"
          >
            {isSubmitting ? 'Creating Podcast Job...' : 'Create Podcast Job'}
          </Button>

          {job && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Job ID:</span> {job.jobId}
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={
                    job.status === 'ready'
                      ? 'text-green-600'
                      : job.status === 'failed'
                        ? 'text-red-600'
                        : 'text-yellow-700'
                  }
                >
                  {job.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!job.jobId || isPolling}
                  onClick={() => pollJob(job.jobId)}
                >
                  {isPolling ? 'Polling…' : 'Refresh Status'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!job.turns.some((t) => t.videoUrl && t.status === 'ready')}
                  onClick={playSequence}
                >
                  Play Sequence
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={
                    isStitching ||
                    !job.turns.some((t) => t.videoUrl && t.status === 'ready')
                  }
                  onClick={handleStitchVideos}
                >
                  {isStitching ? 'Stitching...' : '🎬 Stitch Videos'}
                </Button>
              </div>
              {(job as any).stitchedVideoUrl && (
                <div className="mt-2 rounded-md border p-2 text-xs">
                  <p className="font-medium text-green-600">✅ Stitched Video Ready!</p>
                  <a
                    href={(job as any).stitchedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    Download Stitched Video
                  </a>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-destructive mt-2 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversation Script</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTurn}
          >
            + Add Turn
          </Button>
        </div>

        <div className="space-y-3">
          {turns.map((turn, index) => {
            const isHost = turn.speaker === 'host';
            const label = isHost ? 'Host' : 'Guest';
            const colorClass = isHost ? 'border-blue-400' : 'border-amber-400';

            return (
              <div
                key={index}
                className={`flex flex-col gap-2 rounded-md border p-3 text-sm md:flex-row md:items-start ${colorClass}`}
              >
                <div className="flex items-center gap-2 md:w-32">
                  <select
                    value={turn.speaker}
                    onChange={(e) =>
                      handleUpdateTurn(index, {
                        speaker: e.target.value as SpeakerRole,
                      })
                    }
                    className="w-full rounded-md border px-2 py-1 text-xs"
                  >
                    <option value="host">Host</option>
                    <option value="guest">Guest</option>
                  </select>
                  <span className="hidden text-xs text-muted-foreground md:inline">
                    #{index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium">
                      {label} line #{index + 1}
                    </span>
                    <textarea
                      value={turn.text}
                      onChange={(e) =>
                        handleUpdateTurn(index, { text: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-md border px-2 py-1 text-xs md:text-sm"
                      placeholder={
                        isHost
                          ? 'Welcome the audience, introduce the topic...'
                          : 'Respond as the guest, share insights...'
                      }
                    />
                  </label>
                </div>
                <div className="flex flex-col items-end gap-2 md:w-24">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTurn(index)}
                    disabled={turns.length <= 1}
                    aria-label="Remove turn"
                  >
                    ✕
                  </Button>
                  {job && job.turns[index] && (
                    <span className="text-[10px] text-muted-foreground">
                      {job.turns[index].status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {job && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Podcast Clips</h2>
            {job.turns.some((t) => t.videoUrl && t.status === 'ready') && (
              <Button
                variant="outline"
                size="sm"
                onClick={playSequence}
                disabled={isPlayingSequence}
              >
                {isPlayingSequence ? 'Playing...' : 'Play Sequence'}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Each turn becomes a separate HeyGen talking photo video clip (720p).
            Videos typically take 3-5 minutes to generate. When ready in HeyGen dashboard,
            paste the video URL below to mark it as ready.
          </p>
          <ol className="space-y-3 text-sm">
            {job.turns.map((turn) => (
              <li key={turn.index} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                  <span className="font-medium">
                    #{turn.index + 1} {turn.speaker === 'host' ? 'Host' : 'Guest'}
                  </span>
                    <span className={`ml-2 text-xs ${
                      turn.status === 'ready' ? 'text-green-600' :
                      turn.status === 'failed' ? 'text-red-600' :
                      turn.status === 'processing' ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                    {turn.status}
                  </span>
                    {turn.heygenVideoId && (
                      <span className="text-muted-foreground ml-2 text-xs font-mono">
                        HeyGen ID: {turn.heygenVideoId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                  {turn.status !== 'ready' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUrl(turn.index)}
                      className="text-xs"
                    >
                      {turn.videoUrl ? 'Update URL' : 'Add URL'}
                    </Button>
                  )}
                </div>

                {editingUrlIndex === turn.index ? (
                  <div className="space-y-2 mt-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste video URL from HeyGen dashboard..."
                      className="w-full rounded-md border px-2 py-1 text-xs font-mono"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateVideoUrl(turn.index, urlInput)}
                        disabled={!urlInput.trim()}
                        className="text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : turn.videoUrl && turn.status === 'ready' ? (
                  <div className="mt-2">
                    {(() => {
                      const readyTurns = job.turns.filter((t) => t.videoUrl && t.status === 'ready');
                      const readyIndex = readyTurns.findIndex((t) => t.index === turn.index);
                      const isCurrentPlaying = isPlayingSequence && currentPlayingIndex === readyIndex;
                      const isUpcoming = isPlayingSequence && currentPlayingIndex !== null && readyIndex > currentPlayingIndex;
                      
                      return (
                        <>
                          {isCurrentPlaying ? (
                            <video
                              key={`playing-${turn.index}`}
                              src={turn.videoUrl}
                              controls
                              autoPlay
                              className="w-full rounded-md border-2 border-blue-500"
                              onEnded={() => handleVideoEnd(turn.index)}
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <video
                              src={turn.videoUrl}
                              controls={!isPlayingSequence}
                              className={`w-full rounded-md ${
                                isUpcoming ? 'opacity-50' : ''
                              }`}
                              preload="metadata"
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}
                          {isCurrentPlaying && (
                            <p className="text-xs text-blue-600 mt-1">▶️ Now playing...</p>
                          )}
                          {isUpcoming && (
                            <p className="text-xs text-gray-500 mt-1">⏸️ Up next...</p>
                          )}
                        </>
                      );
                    })()}
                  <a
                    href={turn.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                      className="text-xs text-blue-600 underline hover:text-blue-800 mt-1 inline-block"
                    >
                      Open in new tab
                    </a>
                  </div>
                ) : turn.status === 'processing' ? (
                  <p className="text-muted-foreground text-xs mt-2">
                    Video is generating... Check HeyGen dashboard and paste URL when ready.
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Separate Video Stitching Section */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Video Stitching Tool</h2>
            <p className="text-muted-foreground text-xs mt-1">
              Stitch multiple videos together into a single video. Upload video files or paste video URLs. Videos will be stitched in the order you add them.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* File Upload Section */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload Video Files:</p>
            {stitchVideoFiles.map((file, index) => (
              <div key={`file-${index}`} className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, index)}
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <span className="text-xs text-muted-foreground">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddFileSlot}
            >
              + Add File Upload
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Or Enter Video URLs:</p>
            {stitchVideoUrls.map((url, index) => (
              <div key={`url-${index}`} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUpdateStitchUrl(index, e.target.value)}
                  placeholder={`Video URL ${index + 1} (e.g., https://example.com/video.mp4)`}
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                />
                {stitchVideoUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveStitchUrl(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddStitchUrl}
            >
              + Add Video URL
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleStitchStandalone}
              disabled={
                isStitchingStandalone ||
                (stitchVideoUrls.filter((url) => url.trim().length > 0).length + stitchVideoFiles.filter((f) => f != null).length) < 2
              }
            >
              {isStitchingStandalone ? 'Stitching...' : '🎬 Stitch Videos'}
            </Button>
          </div>

          {standaloneStitchedUrl && (
            <div className="mt-4 rounded-md border border-green-500 bg-green-50 p-3 dark:bg-green-950">
              <p className="font-medium text-green-700 dark:text-green-300 mb-2">
                ✅ Stitched Video Ready!
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={standaloneStitchedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline hover:text-blue-800 text-sm"
                >
                  Download Stitched Video
                </a>
                <video
                  src={standaloneStitchedUrl}
                  controls
                  className="w-full rounded-md border max-h-96"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          <div className="text-muted-foreground text-xs">
            <p className="font-medium mb-1">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You can mix uploaded files and URLs - they'll be stitched in order</li>
              <li>Videos will be stitched in the order you add them (files first, then URLs)</li>
              <li>All videos should be in the same format (MP4 recommended)</li>
              <li>Make sure ffmpeg is installed on the server</li>
              <li>Large videos may take several minutes to process</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


