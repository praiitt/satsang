'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Mic2, 
  Plus, 
  Trash2, 
  Play, 
  RefreshCcw, 
  Scissors, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  MessageSquare, 
  Video, 
  Upload, 
  Info,
  Sparkles,
  Search,
  Check,
  Languages
} from 'lucide-react';
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

// --- HELPER COMPONENTS ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 ${className}`}
  >
    {children}
  </motion.div>
);

const SectionHeading = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) => (
  <div className="mb-6 flex items-start gap-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/20">
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  </div>
);

const AvatarSelector = ({ 
  label, 
  value, 
  onChange,
  typeValue,
  onTypeChange
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  typeValue?: 'avatar' | 'talking_photo';
  onTypeChange?: (val: 'avatar' | 'talking_photo') => void;
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
    </div>

    {onTypeChange && typeValue && (
      <div className="relative mb-2 shrink-0">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Asset Type</label>
        <select
          value={typeValue}
          onChange={(e) => onTypeChange(e.target.value as 'avatar' | 'talking_photo')}
          className="w-full rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
        >
          <option value="avatar">Video Avatar (Default)</option>
          <option value="talking_photo">Talking Photo</option>
        </select>
      </div>
    )}

    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter HeyGen Avatar ID (e.g. 054b...)"
        className="w-full rounded-xl border border-gray-100 bg-gray-50/50 p-4 pl-12 text-sm font-mono outline-none transition-all focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-900 shadow-inner"
      />
      <Users className="absolute left-4 top-[50%] h-5 w-5 -translate-y-1/2 text-orange-400" />
    </div>
    <p className="text-[10px] text-gray-400 italic">"Ensure the ID matches your selected Asset Type"</p>
  </div>
);

const VoiceSelector = ({ 
  label, 
  value, 
  onChange, 
  voices, 
  langFilter, 
  setLangFilter, 
  genderFilter, 
  setGenderFilter, 
  languages, 
  genders, 
  loading, 
  onPreview, 
  previewing 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  voices: any[], 
  langFilter: string, 
  setLangFilter: (val: string) => void, 
  genderFilter: string, 
  setGenderFilter: (val: string) => void, 
  languages: string[], 
  genders: string[], 
  loading: boolean, 
  onPreview: (id: string) => void, 
  previewing: string | null 
}) => (
  <div className="flex flex-col gap-3">
    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
    <div className="grid grid-cols-2 gap-2">
      <select
        value={langFilter}
        onChange={(e) => setLangFilter(e.target.value)}
        className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-900"
      >
        <option value="">All Languages</option>
        {languages.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <select
        value={genderFilter}
        onChange={(e) => setGenderFilter(e.target.value)}
        className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-900"
      >
        <option value="">All Genders</option>
        {genders.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
    </div>
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-xl border border-gray-100 bg-white p-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-900"
        disabled={loading}
      >
        <option value="">Select a Voice...</option>
        {voices.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} ({v.language || 'Unknown'})
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPreview(value)}
        disabled={!value || previewing === value}
        className="h-[46px] w-[46px] rounded-xl border-gray-100 dark:border-gray-800"
      >
        {previewing === value ? (
          <RefreshCcw className="h-4 w-4 animate-spin text-orange-600" />
        ) : (
          <Play className="h-4 w-4 text-orange-600" />
        )}
      </Button>
    </div>
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste ID manually..."
        className="w-full rounded-xl border border-gray-100 bg-gray-50/50 p-3 pl-10 text-xs font-mono outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-900"
      />
      <Mic2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  </div>
);

export default function MarketingPodcastPage() {
  // Pre-fill with working talking photo ID and voice ID
  const DEFAULT_TALKING_PHOTO_ID = 'f31ce977d65e47caa3e92a46703d6b1f';
  const DEFAULT_VOICE_ID = 'dc5370c68baa4905be87f702758df4b0';

  const [hostAvatarId, setHostAvatarId] = useState(DEFAULT_TALKING_PHOTO_ID);
  const [hostAvatarType, setHostAvatarType] = useState<'avatar' | 'talking_photo'>('talking_photo');
  const [guestAvatarId, setGuestAvatarId] = useState(DEFAULT_TALKING_PHOTO_ID);
  const [guestAvatarType, setGuestAvatarType] = useState<'avatar' | 'talking_photo'>('talking_photo');
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
  const [voices, setVoices] = useState<
    Array<{ id: string; name: string; language?: string; gender?: string; previewAudio?: string }>
  >([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [hostLanguageFilter, setHostLanguageFilter] = useState<string>('');
  const [hostGenderFilter, setHostGenderFilter] = useState<string>('');
  const [guestLanguageFilter, setGuestLanguageFilter] = useState<string>('');
  const [guestGenderFilter, setGuestGenderFilter] = useState<string>('');
  const [isStitching, setIsStitching] = useState(false);
  // Separate video stitching state
  const [stitchVideoUrls, setStitchVideoUrls] = useState<string[]>(['']);
  const [stitchVideoFiles, setStitchVideoFiles] = useState<(File | null)[]>([null]); // Start with one file slot
  const [standaloneStitchedUrl, setStandaloneStitchedUrl] = useState<string | null>(null);
  const [uniqueLanguages, setUniqueLanguages] = useState<string[]>([]);
  const [uniqueGenders, setUniqueGenders] = useState<string[]>([]);
  const [initialJobId, setInitialJobId] = useState<string | null>(null);


  const handleAddTurn = () => {
    const lastSpeaker = turns[turns.length - 1]?.speaker ?? 'guest';
    const nextSpeaker: SpeakerRole = lastSpeaker === 'host' ? 'guest' : 'host';
    setTurns((prev) => [...prev, { speaker: nextSpeaker, text: '' }]);
  };

  const handleUpdateTurn = (index: number, patch: Partial<TurnInput>) => {
    setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
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
          hostAvatarType,
          guestAvatarType,
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
        throw new Error(data?.error || data?.details || 'Failed to create podcast job');
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
          throw new Error(data?.error || data?.details || 'Failed to fetch podcast status');
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

  const fetchVoices = async () => {
    setLoadingVoices(true);
    try {
      const res = await fetch('/api/marketing/podcast/voices');
      const data = await res.json();
      console.log('[fetchVoices] Response:', {
        ok: res.ok,
        status: res.status,
        voicesCount: data.voices?.length,
        error: data.error,
      });
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

  const previewVoice = async (voiceId: string) => {
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
        alert(
          `Preview video is being generated! Video ID: ${data.videoId}\n\nCheck your HeyGen dashboard to see the preview video.`
        );
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
        alert(
          `✅ Videos stitched successfully! ${data.videoCount} videos combined.\n\nOutput: ${data.outputPath}`
        );
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
        alert(
          `✅ Videos stitched successfully! ${data.videoCount} videos combined.\n\nOutput: ${data.outputPath}`
        );
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

  // Get unique languages and genders from voices for filtering
  useEffect(() => {
    if (voices.length > 0) {
      const langs = Array.from(new Set(voices.map(v => v.language).filter(Boolean))).sort() as string[];
      const gens = Array.from(new Set(voices.map(v => v.gender).filter(Boolean))).sort() as string[];
      setUniqueLanguages(langs);
      setUniqueGenders(gens);
    }
  }, [voices]);

  // Initial Data Fetch & Poll Check
  useEffect(() => {
    fetchVoices();
    
    const query = new URLSearchParams(window.location.search);
    const id = query.get('jobId');
    if (id) {
      setInitialJobId(id);
      void pollJob(id);
    }
  }, []);

  const getFilteredVoices = (languageFilter: string, genderFilter: string) => {
    return voices.filter((voice) => {
      const matchesLanguage = !languageFilter || voice.language === languageFilter;
      const matchesGender =
        !genderFilter || voice.gender?.toLowerCase() === genderFilter.toLowerCase();
      return matchesLanguage && matchesGender;
    });
  };

  const filteredHostVoices = getFilteredVoices(hostLanguageFilter, hostGenderFilter);
  const filteredGuestVoices = getFilteredVoices(guestLanguageFilter, guestGenderFilter);

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
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2c2c] dark:bg-[#0f1115] dark:text-[#e0e0e0]">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-transparent py-12 dark:from-orange-950/10">
        <div className="container mx-auto max-w-5xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-500/20">
                <Mic2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-orange-600">Studio</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-[#1a1a1a] dark:text-white md:text-5xl">
              Marketing <span className="text-orange-600">Podcast</span>
            </h1>
            <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              Create immersive, AI-driven conversations between spiritual masters. 
              Configure your avatars, craft the script, and generate studio-quality videos.
            </p>
          </motion.div>
        </div>
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/20 blur-3xl dark:bg-orange-800/10" />
      </div>

      <div className="container mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Configuration */}
          <div className="space-y-8 lg:col-span-12">
            <Card>
              <SectionHeading 
                icon={Users} 
                title="Avatar & Voice Configuration" 
                subtitle="Choose the voices and talking photos for your spiritual hosts."
              />
              
              <div className="grid gap-12 md:grid-cols-2">
                {/* Host Config */}
                <div className="space-y-8 border-r border-gray-100 pr-0 dark:border-gray-800 md:pr-12">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-tighter text-blue-500">Host Avatar</span>
                  </div>
                  
                  <AvatarSelector 
                    label="Talking Photo"
                    value={hostAvatarId}
                    onChange={setHostAvatarId}
                    typeValue={hostAvatarType}
                    onTypeChange={setHostAvatarType}
                  />
                  
                  <VoiceSelector 
                    label="Voice Identity"
                    value={hostVoiceId}
                    onChange={setHostVoiceId}
                    voices={filteredHostVoices}
                    langFilter={hostLanguageFilter}
                    setLangFilter={setHostLanguageFilter}
                    genderFilter={hostGenderFilter}
                    setGenderFilter={setHostGenderFilter}
                    languages={uniqueLanguages}
                    genders={uniqueGenders}
                    loading={loadingVoices}
                    onPreview={previewVoice}
                    previewing={previewingVoice}
                  />
                </div>

                {/* Guest Config */}
                <div className="space-y-8">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-tighter text-amber-500">Guest Avatar</span>
                  </div>

                  <AvatarSelector 
                    label="Talking Photo"
                    value={guestAvatarId}
                    onChange={setGuestAvatarId}
                    typeValue={guestAvatarType}
                    onTypeChange={setGuestAvatarType}
                  />

                  <VoiceSelector 
                    label="Voice Identity"
                    value={guestVoiceId}
                    onChange={setGuestVoiceId}
                    voices={filteredGuestVoices}
                    langFilter={guestLanguageFilter}
                    setLangFilter={setGuestLanguageFilter}
                    genderFilter={guestGenderFilter}
                    setGenderFilter={setGuestGenderFilter}
                    languages={uniqueLanguages}
                    genders={uniqueGenders}
                    loading={loadingVoices}
                    onPreview={previewVoice}
                    previewing={previewingVoice}
                  />
                </div>
              </div>

              <div className="mt-12 flex flex-col gap-4 border-t border-gray-50 pt-8 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    High-Fidelity AI Avatars
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {voices.length} Voices Available
                  </div>
                </div>
                
                <Button 
                  onClick={createJob} 
                  disabled={isSubmitting || isPolling}
                  className="rounded-xl bg-orange-600 px-8 py-6 text-lg font-bold shadow-lg shadow-orange-600/20 hover:bg-orange-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCcw className="h-5 w-5 animate-spin" /> Initializing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Generate Podcast <ChevronRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </Card>

            {/* Conversation Script */}
            <Card>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeading 
                  icon={MessageSquare} 
                  title="Conversation Script" 
                  subtitle="Draft the dialogue for your podcast turns."
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddTurn}
                  className="rounded-xl border-orange-100 bg-orange-50/50 text-orange-600 hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-900/10"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Turn
                </Button>
              </div>

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {turns.map((turn, index) => {
                    const isHost = turn.speaker === 'host';
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: isHost ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`flex gap-4 ${isHost ? 'flex-row' : 'flex-row-reverse'}`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${isHost ? 'bg-blue-500' : 'bg-amber-500'}`}>
                          {isHost ? 'H' : 'G'}
                        </div>
                        <div className={`flex flex-1 flex-col gap-2 ${isHost ? 'items-start' : 'items-end'}`}>
                          <div className={`relative w-full max-w-2xl rounded-2xl p-4 shadow-sm ${
                            isHost 
                              ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30' 
                              : 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30'
                          }`}>
                            <div className="mb-2 flex items-center justify-between">
                              <select
                                value={turn.speaker}
                                onChange={(e) => handleUpdateTurn(index, { speaker: e.target.value as SpeakerRole })}
                                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-gray-400 outline-none"
                              >
                                <option value="host">Host</option>
                                <option value="guest">Guest</option>
                              </select>
                              <button 
                                onClick={() => handleRemoveTurn(index)}
                                disabled={turns.length <= 1}
                                className="text-gray-400 transition-colors hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <textarea
                              value={turn.text}
                              onChange={(e) => handleUpdateTurn(index, { text: e.target.value })}
                              rows={2}
                              className="w-full bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700"
                              placeholder={isHost ? "Host leads the conversation..." : "Guest responds..."}
                            />
                            <div className="absolute -bottom-2 right-4 text-[10px] font-mono text-gray-300">
                              #{index + 1}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </Card>

            {/* Results Section */}
            {job && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <Card className="border-orange-200 bg-orange-50/30 dark:border-orange-900/30">
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
                        <Video className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Generation Progress</h2>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 uppercase tracking-tighter text-[10px] font-bold">Job ID:</span>
                          <span className="font-mono text-xs text-orange-600">{job.jobId}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => pollJob(job.jobId)}
                        disabled={isPolling}
                        className="rounded-xl border-gray-200 bg-white"
                      >
                        <RefreshCcw className={`mr-2 h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} />
                        {isPolling ? 'Polling...' : 'Check Status'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={playSequence}
                        disabled={!job.turns.some(t => t.videoUrl && t.status === 'ready') || isPlayingSequence}
                        className="rounded-xl border-gray-200 bg-white"
                      >
                        <Play className="mr-2 h-4 w-4" /> Preview All
                      </Button>

                      <Button
                        onClick={handleStitchVideos}
                        disabled={isStitching || !job.turns.some(t => t.videoUrl && t.status === 'ready')}
                        className="rounded-xl bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black"
                      >
                        <Scissors className={`mr-2 h-4 w-4 ${isStitching ? 'animate-spin' : ''}`} />
                        {isStitching ? 'Stitching...' : 'Stitch Final Video'}
                      </Button>
                    </div>
                  </div>

                  {(job as any).stitchedVideoUrl && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-800"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-bold text-green-600">
                          <CheckCircle2 className="h-5 w-5" /> Stitched Video Ready
                        </h3>
                        <a 
                          href={(job as any).stitchedVideoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                        >
                          <Download className="h-4 w-4" /> Download
                        </a>
                      </div>
                      <video 
                        src={(job as any).stitchedVideoUrl} 
                        controls 
                        className="aspect-video w-full rounded-2xl border bg-black shadow-inner"
                      />
                    </motion.div>
                  )}
                </Card>

                {/* Individual Clips Timeline */}
                <div className="space-y-6">
                  <SectionHeading 
                    icon={Video} 
                    title="Podcast Clips" 
                    subtitle="Individual video segments generated by HeyGen."
                  />
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {job.turns.map((turn, i) => (
                      <Card key={turn.index} className="overflow-hidden p-0">
                        <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${turn.speaker === 'host' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                              {turn.speaker === 'host' ? 'H' : 'G'}
                            </span>
                            <span className="text-sm font-bold">Turn #{turn.index + 1}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              turn.status === 'ready' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                              turn.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                              'bg-orange-100 text-orange-700 dark:bg-orange-900/30'
                            }`}>
                              {turn.status}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <p className="line-clamp-2 text-xs italic text-gray-500 mb-4">"{turn.text}"</p>
                          
                          {turn.status === 'ready' && turn.videoUrl ? (
                            <div className="relative group rounded-xl overflow-hidden border dark:border-gray-800 bg-black">
                              <video 
                                src={turn.videoUrl} 
                                controls={!isPlayingSequence}
                                autoPlay={isPlayingSequence && currentPlayingIndex === i}
                                onEnded={() => handleVideoEnd(turn.index)}
                                className={`aspect-video w-full ${isPlayingSequence && currentPlayingIndex === i ? 'border-2 border-orange-500' : ''}`}
                              />
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={turn.videoUrl} target="_blank" rel="noreferrer" className="p-2 bg-black/50 rounded-full text-white backdrop-blur-sm">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center dark:border-gray-800 dark:bg-gray-900 group relative overflow-hidden">
                              {turn.status === 'processing' ? (
                                <>
                                  <RefreshCcw className="mb-2 h-8 w-8 animate-spin text-orange-300" />
                                  <p className="text-xs text-orange-500 font-medium tracking-tight">AI is generating this clip...</p>
                                  <p className="text-[10px] text-gray-400 mt-1 uppercase">Webhooks will update automatically</p>
                                  
                                  {/* Hover overlay to allow edit */}
                                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm z-10">
                                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Taking too long?</span>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleEditUrl(turn.index)}
                                      className="h-8 rounded-lg text-[10px] bg-white/10 hover:bg-white/20 text-white"
                                    >
                                      Override & Add URL
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Info className="mb-2 h-8 w-8 text-gray-200" />
                                  <p className="text-xs text-gray-400">Waiting for generation to start</p>
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    onClick={() => handleEditUrl(turn.index)}
                                    className="text-[10px] text-blue-500"
                                  >
                                    Manually Add URL
                                  </Button>
                                </>
                              )}
                            </div>
                          )}

                          {editingUrlIndex === turn.index && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 space-y-3 border-t border-gray-50 pt-4 dark:border-gray-800"
                            >
                              <div className="relative">
                                <input
                                  type="text"
                                  value={urlInput}
                                  onChange={(e) => setUrlInput(e.target.value)}
                                  placeholder="Paste HeyGen URL..."
                                  className="w-full rounded-xl border border-gray-100 bg-gray-50 p-2 text-xs font-mono outline-none dark:border-gray-800 dark:bg-gray-900"
                                />
                                <Upload className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => updateVideoUrl(turn.index, urlInput)} className="h-8 rounded-lg text-[10px]">Save URL</Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 rounded-lg text-[10px]">Cancel</Button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Standalone Video Stitching Tool */}
            <Card className="border-dashed border-gray-300 bg-transparent shadow-none dark:border-gray-800">
               <SectionHeading 
                  icon={Scissors} 
                  title="Quick Stitch Tool" 
                  subtitle="Manually merge external videos or files."
                />
                
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Upload Files
                    </h3>
                    <div className="space-y-3">
                      {stitchVideoFiles.map((file, index) => (
                        <div key={`file-${index}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900 border dark:border-gray-800">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleFileSelect(e, index)}
                            className="flex-1 text-xs file:hidden"
                          />
                          {file ? (
                            <span className="truncate text-[10px] font-bold text-green-600 max-w-[150px]">{file.name}</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Click to choose file</span>
                          )}
                          <button onClick={() => handleRemoveFile(index)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={handleAddFileSlot} className="w-full rounded-xl border-dashed border border-gray-200 text-gray-400 hover:border-orange-500 hover:text-orange-500">
                        + Add File Slot
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> Video URLs
                    </h3>
                    <div className="space-y-3">
                      {stitchVideoUrls.map((url, index) => (
                        <div key={`url-${index}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900 border dark:border-gray-800">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => handleUpdateStitchUrl(index, e.target.value)}
                            placeholder="https://..."
                            className="flex-1 bg-transparent text-xs outline-none"
                          />
                          {stitchVideoUrls.length > 1 && (
                            <button onClick={() => handleRemoveStitchUrl(index)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                          )}
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={handleAddStitchUrl} className="w-full rounded-xl border-dashed border border-gray-200 text-gray-400 hover:border-orange-500 hover:text-orange-500">
                        + Add URL Slot
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                    Ready to Merge {stitchVideoFiles.filter(f => f).length + stitchVideoUrls.filter(u => u).length} items
                  </div>
                  <Button
                    onClick={handleStitchStandalone}
                    disabled={isStitchingStandalone || (stitchVideoUrls.filter(u => u.trim()).length + stitchVideoFiles.filter(f => f).length < 2)}
                    className="rounded-xl bg-orange-600 px-6 font-bold shadow-lg shadow-orange-600/20"
                  >
                    {isStitchingStandalone ? (
                      <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 animate-spin" /> Stitching...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Scissors className="h-4 w-4" /> Stitch Videos</span>
                    )}
                  </Button>
                </div>

                {standaloneStitchedUrl && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-800"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold text-green-600 uppercase tracking-tighter text-xs">Standalone Result</h3>
                      <a href={standaloneStitchedUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                    <video src={standaloneStitchedUrl} controls className="w-full rounded-2xl border bg-black shadow-inner" />
                  </motion.div>
                )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
