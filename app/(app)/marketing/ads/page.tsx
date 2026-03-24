'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Copy, Send, Sparkles, Image as ImageIcon, Video, Trash2, 
  ChevronDown, ChevronUp, ChevronRight, RefreshCw, ExternalLink, Bot, Play, Edit3,
  Layout, Target, Users, Megaphone, CheckCircle2, AlertCircle, X,
  ArrowRight, Plus, Search, Filter, Monitor, Smartphone, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/livekit/button';
import { getCurrentUser } from '@/lib/auth-api';
import { MarketingAgentInterface } from '@/components/marketing/marketing-agent-interface';

// --- Types ---
interface AdBrief {
  id: string;
  title: string;
  topic: string;
  objective: string;
  audience: string;
  cta: string;
  tone: string;
  language: string;
  channels: string[];
  createdAt: number;
  latestVideoUrl?: string;
  latestVideoStatus?: string;
}

interface AdVariant {
  id: string;
  type: 'text' | 'image';
  platform?: string;
  caption?: string;
  hashtags?: string[];
  hooks?: string[];
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoStatus?: 'queued' | 'processing' | 'ready' | 'failed';
  videoId?: string;
  videoScript?: string;
  videoThumbnailUrl?: string;
  videoError?: string;
  publishedAt?: number;
  publishedToChannels?: string[];
  publishStatus?: 'published' | 'partial' | 'failed';
  lastPublishError?: string;
  createdAt: number;
}

interface BufferChannel {
  id: string;
  name: string;
  service: string;
  username?: string;
}

const API = '/api/marketing/ads';
const PLATFORMS = ['instagram', 'twitter', 'linkedin', 'facebook'];
const TONES = ['devotional', 'inspirational', 'informative', 'playful', 'emotional'];
const LANGUAGES = ['english', 'hindi', 'hinglish'];
const OBJECTIVES = ['Awareness', 'App Downloads', 'Engagement', 'Event Promotion', 'Community Building'];

const FALLBACK_AVATARS = [
  { id: 'f31ce977d65e47caa3e92a46703d6b1f', name: 'Rraasi Brand Avatar', type: 'Talking Photo', thumbnail: '/avatars/brand.png' },
  { id: 'Anna_public_3_20240108', name: 'Anna (Professional)', type: 'Video Avatar', thumbnail: '/avatars/anna.png' },
  { id: 'Susan_public_2_20240108', name: 'Susan (Casual)', type: 'Video Avatar', thumbnail: '/avatars/susan.png' },
  { id: 'Edward_public_1_20240108', name: 'Edward (Corporate)', type: 'Video Avatar', thumbnail: '/avatars/edward.png' },
];

const platformInfo: Record<string, { icon: any, color: string }> = {
  instagram: { icon: Smartphone, color: 'from-purple-500 to-pink-500' },
  twitter: { icon: MessageSquare, color: 'from-sky-400 to-blue-500' },
  linkedin: { icon: Monitor, color: 'from-blue-600 to-blue-800' },
  facebook: { icon: Users, color: 'from-blue-500 to-indigo-600' },
};

// --- Helper Components ---
const Card = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-[#1a1c20] border border-white/5 rounded-3xl overflow-hidden shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

const SectionHeading = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) => (
  <div className="flex items-center gap-4 mb-6">
    <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
      <Icon className="h-6 w-6 text-orange-400" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-white/40">{subtitle}</p>}
    </div>
  </div>
);

// --- Main Page ---
export default function AdsPage() {
  const [briefs, setBriefs] = useState<AdBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<AdBrief | null>(null);
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [bufferChannels, setBufferChannels] = useState<BufferChannel[]>([]);
  const [bufferConfigured, setBufferConfigured] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null);
  const activePolls = useRef(new Set<string>());
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [imageProvider, setImageProvider] = useState<'gemini' | 'dalle'>('dalle');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState<AdVariant | null>(null);
  const [showVideoConfigModal, setShowVideoConfigModal] = useState<AdVariant | null>(null);
  const [videoConfig, setVideoConfig] = useState<{ script: string; avatarId: string; avatarType: 'avatar' | 'talking_photo' }>({ script: '', avatarId: '', avatarType: 'avatar' });
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');

  const [showAgent, setShowAgent] = useState(false);
  const [agentToken, setAgentToken] = useState('');
  const [agentUrl, setAgentUrl] = useState('');

  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    title: '',
    topic: '',
    objective: 'Awareness',
    audience: 'Spiritual seekers aged 25-45 in India',
    cta: 'Download the Rraasi app',
    tone: 'inspirational',
    languages: ['english'],
    channels: ['instagram'],
  });

  const authHeaders = async () => {
    await getCurrentUser().catch(() => { });
    return { 'Content-Type': 'application/json' };
  };

  const startAgent = async () => {
    try {
      const headers = await authHeaders();
      let userId = undefined;
      try {
        const user = await getCurrentUser();
        if (user) userId = (user as any).uid || (user as any).id;
      } catch (e) { }

      const res = await fetch('/api/connection-details', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          room_config: { agents: [{ agent_name: 'chitragupta' }] }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get connection details');
      setAgentToken(data.participantToken);
      setAgentUrl(data.serverUrl);
      setShowAgent(true);
    } catch (e: any) {
      setError('Failed to connect to Chitragupta: ' + e.message);
    }
  };

  const loadBriefs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/briefs`, { credentials: 'include' });
      if (res.status === 401) { setNotLoggedIn(true); return; }
      setNotLoggedIn(false);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setBriefs(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pollIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const selectedBriefIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedBriefIdRef.current = selectedBrief?.id || null;
    pollIntervals.current.forEach(interval => clearInterval(interval));
    pollIntervals.current.clear();
    activePolls.current.clear();
  }, [selectedBrief]);

  useEffect(() => {
    loadBriefs();
    loadBufferChannels();
    return () => {
      pollIntervals.current.forEach(interval => clearInterval(interval));
      pollIntervals.current.clear();
    };
  }, []);

  useEffect(() => {
    if (selectedBrief) loadVariants(selectedBrief.id);
    else setVariants([]);
  }, [selectedBrief]);

  const startPollingVideo = (briefId: string, variantId: string, videoId: string) => {
    if (activePolls.current.has(videoId)) return;
    activePolls.current.add(videoId);

    const interval = setInterval(async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API}/briefs/${briefId}/video-status?videoId=${videoId}&variantId=${variantId}`, {
          headers,
          credentials: 'include'
        });
        const data = await res.json();
        if (data.status === 'ready' || data.status === 'failed') {
          if (pollIntervals.current.has(videoId)) {
            clearInterval(pollIntervals.current.get(videoId)!);
            pollIntervals.current.delete(videoId);
          }
          activePolls.current.delete(videoId);
          if (selectedBriefIdRef.current === briefId) {
            await loadVariants(briefId);
          }
        }
      } catch (e) {
        console.error('Error polling video status:', e);
      }
    }, 5000);
    pollIntervals.current.set(videoId, interval);
  };

  const loadVariants = async (briefId: string) => {
    if (!briefId) return;
    try {
      setLoadingVariants(true);
      const res = await fetch(`${API}/briefs/${briefId}/variants`, { credentials: 'include' });
      const data = await res.json();
      const items = data.items || [];
      setVariants(items);
      items.forEach((v: AdVariant) => {
        if (v.videoStatus === 'processing' && v.videoId && !activePolls.current.has(v.videoId)) {
          startPollingVideo(briefId, v.id, v.videoId);
        }
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingVariants(false);
    }
  };

  const loadBufferChannels = async () => {
    try {
      const res = await fetch(`${API}/buffer/channels`, { credentials: 'include' });
      const data = await res.json();
      setBufferConfigured(data.configured || false);
      setBufferChannels(data.channels || []);
    } catch { }
  };

  const handleCreateBrief = async () => {
    if (!form.title || !form.topic) return setError('Title and Topic are required.');
    try {
      setLoading(true);
      const headers = await authHeaders();
      const res = await fetch(`${API}/briefs`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      await loadBriefs();
      setSelectedBrief(data);
      setShowCreateForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedBrief) return;
    try {
      setGeneratingText(true);
      const headers = await authHeaders();
      await fetch(`${API}/briefs/${selectedBrief.id}/generate`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ platform: selectedPlatform }),
      });
      await loadVariants(selectedBrief.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingText(false);
    }
  };

  const handleGenerateImage = async (variant: AdVariant) => {
    if (!selectedBrief) return;
    try {
      setGeneratingImage(variant.id);
      const headers = await authHeaders();
      await fetch(`${API}/briefs/${selectedBrief.id}/generate-image`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ variantId: variant.id, imagePrompt: variant.imagePrompt, provider: imageProvider }),
      });
      await loadVariants(selectedBrief.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingImage(null);
    }
  };

  const handleGenerateVideo = async (variant: AdVariant) => {
    if (!selectedBrief) return;
    try {
      setGeneratingVideo(variant.id);
      setShowVideoConfigModal(null);
      const headers = await authHeaders();
      const res = await fetch(`${API}/briefs/${selectedBrief.id}/generate-video`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ 
          variantId: variant.id, 
          avatarId: videoConfig.avatarId, 
          avatarType: videoConfig.avatarType,
          customScript: videoConfig.script 
        }),
      });
      const data = await res.json();
      await loadVariants(selectedBrief.id);
      if (data.status !== 'ready' && data.videoId) {
        startPollingVideo(selectedBrief.id, variant.id, data.videoId);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingVideo(null);
    }
  };

  const handleDeleteBrief = async (briefId: string) => {
    if (!confirm('Are you sure you want to delete this entire campaign and all its variants?')) return;
    try {
      const headers = await authHeaders();
      await fetch(`${API}/briefs/${briefId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      if (selectedBrief?.id === briefId) {
        setSelectedBrief(null);
        setVariants([]);
      }
      await loadBriefs();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedBrief || !confirm('Delete this variant?')) return;
    try {
      const headers = await authHeaders();
      await fetch(`${API}/briefs/${selectedBrief.id}/variants/${variantId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      await loadVariants(selectedBrief.id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePublish = async () => {
    if (!selectedBrief || !showPublishModal || !selectedChannels.length) return;
    try {
      setPublishing(showPublishModal.id);
      const headers = await authHeaders();
      await fetch(`${API}/briefs/${selectedBrief.id}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          variantId: showPublishModal.id,
          channelIds: selectedChannels,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      setShowPublishModal(null);
      await loadVariants(selectedBrief.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleDownloadImage = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `satsang-ad-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download failed:', e);
      setError('Failed to download image.');
    }
  };

  const filteredBriefs = useMemo(() => {
    return briefs.filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [briefs, searchQuery]);

  const textVariants = variants.filter(v => v.type === 'text');
  const imageVariants = variants.filter(v => v.type === 'image');
  const imageLookup = useMemo(() => {
    return imageVariants.reduce((acc, iv) => {
      const linkedId = (iv as any).linkedVariantId;
      if (linkedId) acc[linkedId] = iv;
      return acc;
    }, {} as Record<string, AdVariant>);
  }, [imageVariants]);

  return (
    <div className="min-h-screen bg-[#0f1115] text-white selection:bg-orange-500/30">
      {/* --- Premium Header --- */}
      <div className="relative border-b border-white/5 bg-[#1a1c20]/50 backdrop-blur-xl z-20">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <Megaphone className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-[0.2em]">Marketing Studio</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
              Social <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-400 to-orange-400">Ads Studio</span>
            </h1>
            <p className="mt-3 text-white/50 text-sm max-w-md font-medium leading-relaxed">
              Create premium spiritual ad campaigns powered by AI. Generate captions, visuals, and talking avatar videos in seconds.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-4">
            {bufferConfigured ? (
              <div className="group relative">
                <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white/80 transition-all hover:bg-white/10">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  Buffer Connected
                </div>
              </div>
            ) : (
              <button 
                onClick={loadBufferChannels}
                className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ExternalLink className="h-3 w-3" /> Connect Buffer
              </button>
            )}
            
            <button
              onClick={showAgent ? () => setShowAgent(false) : startAgent}
              className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Bot className="h-4 w-4 text-orange-400" />
              {showAgent ? 'Close Assistant' : 'Ask Chitragupta'}
            </button>

            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-2 text-xs font-black text-white shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" /> New Campaign
            </button>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-rose-400 text-sm font-medium">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
            <button onClick={() => setError(null)} className="text-white/20 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
          </motion.div>
        )}

        {showAgent && agentToken && agentUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-10">
            <MarketingAgentInterface
              accessToken={agentToken}
              url={agentUrl}
              onDisconnect={() => setShowAgent(false)}
            />
          </motion.div>
        )}

        {/* --- Create Campaign Form --- */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 overflow-hidden"
            >
              <Card className="p-8 bg-gradient-to-br from-[#1a1c20] to-[#121418]">
                <div className="flex items-center justify-between mb-8">
                  <SectionHeading icon={Plus} title="Launch New Campaign" subtitle="Define your objective and audience" />
                  <button onClick={() => setShowCreateForm(false)} className="text-white/20 hover:text-white"><X className="h-6 w-6" /></button>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Campaign Title</label>
                    <input 
                      type="text" value={form.title} 
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Navratri Special Satsang"
                      className="w-full rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Core Theme</label>
                    <input 
                      type="text" value={form.topic} 
                      onChange={e => setForm({ ...form, topic: e.target.value })}
                      placeholder="e.g. Finding Peace in Chaos"
                      className="w-full rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Campaign Goal</label>
                    <select 
                      value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
                      className="w-full rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all appearance-none"
                    >
                      {OBJECTIVES.map(o => <option key={o} value={o} className="bg-[#1a1c20]">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Target Audience</label>
                    <input 
                      type="text" value={form.audience} 
                      onChange={e => setForm({ ...form, audience: e.target.value })}
                      className="w-full rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-4 lg:col-span-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Target Languages (Select Multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            setForm(p => ({
                              ...p,
                              languages: p.languages?.includes(l) 
                                ? p.languages.filter(x => x !== l) 
                                : [...(p.languages || []), l]
                            }));
                          }}
                          className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${form.languages?.includes(l) ? 'bg-orange-500 border-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={handleCreateBrief} disabled={loading}
                    className="flex items-center gap-2 rounded-2xl bg-orange-500 px-8 py-3 text-xs font-black text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Create Studio Session
                  </button>
                  <button onClick={() => setShowCreateForm(false)} className="px-6 py-3 text-xs font-bold text-white/40 hover:text-white">Cancel</button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-10 lg:grid-cols-[400px,1fr] items-start">
          {/* --- Navigation Panel --- */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-orange-400 transition-colors" />
              <input 
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full rounded-2xl bg-white/5 border border-white/5 pl-11 pr-4 py-4 text-sm focus:bg-white/10 outline-none transition-all"
              />
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredBriefs.map((brief, i) => (
                <motion.button
                  key={brief.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedBrief(brief)}
                  className={`group relative w-full text-left p-5 rounded-3xl border transition-all ${
                    selectedBrief?.id === brief.id 
                    ? 'bg-orange-500/10 border-orange-500/30' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="mb-2 pr-12">
                    <h3 className={`font-bold text-sm leading-tight ${selectedBrief?.id === brief.id ? 'text-orange-400' : 'text-white'}`}>{brief.title}</h3>
                  </div>

                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteBrief(brief.id); }}
                      className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-white/20 transition-all opacity-0 group-hover:opacity-100"
                    ><Trash2 className="h-4 w-4" /></button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedBrief(brief); }}
                      className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center hover:bg-orange-500 text-white transition-all"
                    ><ChevronRight className="h-4 w-4" /></button>
                  </div>

                  <p className="text-[11px] text-white/40 mb-4 line-clamp-2 pr-8">{brief.topic}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex -space-x-1">
                      {brief.channels?.map(c => {
                        const Info = platformInfo[c] || { icon: Megaphone, color: 'bg-white/10' };
                        return (
                          <div key={c} className={`h-6 w-6 rounded-full bg-gradient-to-br ${Info.color} border-2 border-[#1a1c20] flex items-center justify-center text-[10px]`}>
                            <Info.icon className="h-2.5 w-2.5 text-white" />
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/20">{brief.objective}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* --- Studio Workspace --- */}
          <div className="space-y-8">
            {!selectedBrief ? (
              <div className="h-[500px] rounded-[40px] border border-dashed border-white/5 flex flex-col items-center justify-center text-center p-12 bg-white/[0.02]">
                <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                  <Layout className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Welcome to the Studio</h3>
                <p className="text-white/40 text-sm max-w-xs mx-auto">Select a campaign or create a new one to start your AI generation journey.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Active Campaign Info */}
                <Card className="p-8 bg-gradient-to-r from-[#1a1c20] to-[#121418] border-orange-500/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Target className="h-32 w-32" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-[0.2em] mb-3">
                      <div className="h-2 w-2 rounded-full bg-orange-500" /> Active Session
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter mb-4">{selectedBrief.title}</h2>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase text-white/30 block mb-0.5 tracking-wider">Goal</span>
                        <span className="text-sm font-bold text-white/80">{selectedBrief.objective}</span>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase text-white/30 block mb-0.5 tracking-wider">Tone</span>
                        <span className="text-sm font-bold text-white/80 capitalize">{selectedBrief.tone}</span>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase text-white/30 block mb-0.5 tracking-wider">Language</span>
                        <span className="text-sm font-bold text-white/80 capitalize">{selectedBrief.language}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Automation Bar */}
                <Card className="p-1 px-6 bg-[#1a1c20] border-orange-500/20">
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Bot className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Generate High-Impact Content</div>
                        <div className="text-xs text-white/40">Gemini will draft captions, hooks and hashtags for {selectedPlatform}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex bg-black/40 p-1 rounded-xl h-10">
                        {PLATFORMS.map(p => {
                          const Info = platformInfo[p];
                          return (
                            <button
                              key={p}
                              onClick={() => setSelectedPlatform(p)}
                              className={`px-3 flex items-center gap-2 rounded-lg transition-all text-[10px] font-bold ${
                                selectedPlatform === p ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                              }`}
                            >
                              <Info.icon className="h-3 w-3" /> <span className="hidden sm:inline capitalize">{p}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleGenerateContent}
                        disabled={generatingText}
                        className="h-10 px-6 rounded-xl bg-gradient-to-r from-orange-400 to-rose-400 text-black font-black text-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {generatingText ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Generate Now'}
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Posts Feed */}
                <div className="space-y-8">
                  <SectionHeading icon={Layout} title="Campaign Posts" subtitle={`${textVariants.length} variations generated`} />
                  
                  {loadingVariants ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20 uppercase text-[10px] font-black tracking-widest">
                      <RefreshCw className="h-8 w-8 animate-spin" />
                      Loading Studio Feed...
                    </div>
                  ) : textVariants.length === 0 ? (
                    <div className="py-20 rounded-[40px] border border-dashed border-white/5 flex flex-col items-center justify-center bg-white/[0.01]">
                      <Bot className="h-10 w-10 text-white/10 mb-4" />
                      <p className="text-sm text-white/30 font-medium">Click "Generate Now" to create your first post.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {textVariants.map((variant, i) => {
                        const linkedImage = imageLookup[variant.id];
                        const Info = platformInfo[variant.platform as string] || platformInfo['instagram'];
                        return (
                          <motion.div 
                            key={variant.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <Card className="p-0 border-white/10 shadow-none hover:border-orange-500/20 transition-all">
                              <div className="grid lg:grid-cols-[1fr,360px] divide-x divide-white/5">
                                {/* Left Content */}
                                <div className="p-8 space-y-8">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${Info?.color || 'from-white/10 to-white/5'} flex items-center justify-center`}>
                                        {Info?.icon ? <Info.icon className="h-4 w-4 text-white" /> : <Megaphone className="h-4 w-4 text-white" />}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white uppercase tracking-widest leading-none mb-1">{variant.platform}</span>
                                        {variant.language && <span className="text-[8px] font-black text-orange-400/60 uppercase tracking-tighter">{variant.language}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {variant.publishStatus === 'published' && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase">
                                          <CheckCircle2 className="h-3 w-3" /> Live
                                        </div>
                                      )}
                                      <button onClick={() => handleDeleteVariant(variant.id)} className="text-white/10 hover:text-rose-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                  </div>

                                  <div className="space-y-6">
                                    <div className="space-y-3">
                                      <div className="text-[10px] font-black uppercase text-white/20 tracking-widest flex items-center gap-2">
                                        <Bot className="h-3 w-3" /> AI Hooks
                                      </div>
                                      <div className="grid gap-3">
                                        {variant.hooks?.slice(0, 2).map((hook, hi) => (
                                          <div key={hi} className="group relative bg-white/[0.03] rounded-2xl p-4 pr-12 border border-transparent hover:border-orange-500/20 transition-all">
                                            <p className="text-sm font-medium text-white/80 leading-relaxed italic">"{hook}"</p>
                                            <button 
                                              onClick={() => handleCopy(hook, `hook-${variant.id}-${hi}`)}
                                              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-orange-400"
                                            >
                                              {copied === `hook-${variant.id}-${hi}` ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="text-[10px] font-black uppercase text-white/20 tracking-widest flex items-center gap-2">
                                        <Edit3 className="h-3 w-3" /> Primary Caption
                                      </div>
                                      <div className="bg-white/5 rounded-2xl p-6 relative group">
                                        <p className="text-sm text-white/80 leading-[1.8] whitespace-pre-wrap">{variant.caption}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                          {variant.hashtags?.map((tag, ti) => (
                                            <span key={ti} className="text-[11px] font-bold text-orange-400/60 hover:text-orange-400 cursor-default transition-colors">
                                              #{tag.replace('#', '')}
                                            </span>
                                          ))}
                                        </div>
                                        <button 
                                          onClick={() => handleCopy(`${variant.caption}\n\n${variant.hashtags?.map(h => '#' + h.replace('#', '')).join(' ')}`, variant.id)}
                                          className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-white/40 hover:text-white border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          {copied === variant.id ? 'Copied' : 'Copy All'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-4 flex gap-4">
                                    <button 
                                      onClick={() => { setShowPublishModal(variant); setSelectedChannels(variant.publishedToChannels || []); }}
                                      className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-3 text-[11px] font-black text-white hover:bg-white/10 transition-all"
                                    >
                                      <Send className="h-4 w-4" /> Queue for Social
                                    </button>
                                  </div>
                                </div>

                                {/* Right Visual Media Panel */}
                                <div className="p-8 bg-black/20 space-y-8">
                                  {/* AI Image Section */}
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="text-[10px] font-black uppercase text-white/20 tracking-widest flex items-center gap-2">
                                        <ImageIcon className="h-3 w-3" /> Visual Asset
                                      </div>
                                      <select 
                                        value={imageProvider} onChange={e => setImageProvider(e.target.value as any)}
                                        className="bg-transparent border-0 text-[10px] font-bold text-white/30 hover:text-orange-400 outline-none cursor-pointer"
                                      >
                                        <option value="dalle" className="bg-[#1a1c20]">DALL-E 3</option>
                                        <option value="gemini" className="bg-[#1a1c20]">Gemini</option>
                                      </select>
                                    </div>
                                    
                                    {linkedImage?.imageUrl || (variant as any).imageUrl ? (
                                      <div className="relative group rounded-3xl overflow-hidden border border-white/5 aspect-square">
                                        <img src={linkedImage?.imageUrl || (variant as any).imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Generated visual" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                          <button 
                                            onClick={() => window.open(linkedImage?.imageUrl || (variant as any).imageUrl, '_blank')}
                                            className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all"
                                          ><ExternalLink className="h-4 w-4" /></button>
                                          <button 
                                            onClick={() => handleDownloadImage(linkedImage?.imageUrl || (variant as any).imageUrl, variant.id)}
                                            className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all"
                                          ><Download className="h-4 w-4" /></button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="aspect-square rounded-3xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-center p-6">
                                        <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-white/10" /></div>
                                        <button 
                                          onClick={() => handleGenerateImage(variant)}
                                          disabled={generatingImage === variant.id}
                                          className="text-[11px] font-black uppercase text-orange-400 hover:text-orange-300 disabled:opacity-50"
                                        >
                                          {generatingImage === variant.id ? 'Rendering...' : 'Generate AI Image'}
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* AI Video Section */}
                                  <div className="space-y-4 pt-8 border-t border-white/5">
                                    <div className="text-[10px] font-black uppercase text-white/20 tracking-widest flex items-center gap-2">
                                      <Video className="h-3 w-3" /> Talking Avatar
                                    </div>

                                    {variant.videoUrl ? (
                                      <div className="relative group rounded-3xl overflow-hidden border border-white/5 aspect-video bg-black/40">
                                        <video src={variant.videoUrl} className="w-full h-full object-contain" controls />
                                      </div>
                                      ) : variant.videoStatus === 'failed' ? (
                                        <div className="relative group aspect-video rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col items-center justify-center gap-3 p-6 overflow-hidden">
                                          <AlertCircle className="h-6 w-6 text-red-500" />
                                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">Generation Failed</span>
                                          <span className="text-[10px] text-white/70 text-center max-w-[200px] leading-tight line-clamp-2">
                                            {variant.videoError || 'Unknown error occurred'}
                                          </span>
                                          
                                          {/* Hover overlay to allow retry */}
                                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl backdrop-blur-sm z-10">
                                            <button 
                                              onClick={(e) => {
                                                e.preventDefault();
                                                setVideoConfig({
                                                  script: (variant.caption || '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
                                                  avatarId: '',
                                                  avatarType: 'avatar'
                                                });
                                                setShowVideoConfigModal(variant);
                                              }}
                                              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-bold text-white transition-colors"
                                            >
                                              Try Again
                                            </button>
                                          </div>
                                        </div>
                                      ) : variant.videoStatus === 'processing' ? (
                                      <div className="relative group aspect-video rounded-3xl bg-orange-500/5 border border-orange-500/20 flex flex-col items-center justify-center gap-3 p-6 overflow-hidden">
                                        <RefreshCw className="h-6 w-6 text-orange-400 animate-spin" />
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest text-center">Video generating...</span>
                                        <span className="text-[8px] text-white/30 text-center uppercase tracking-wider">Updates via Webhook</span>
                                        
                                        {/* Hover overlay to allow retry if stuck */}
                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl backdrop-blur-sm z-10">
                                          <span className="text-[10px] text-white/50 uppercase tracking-wider">Taking too long?</span>
                                          <button 
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setVideoConfig({
                                                script: (variant.caption || '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
                                                avatarId: '',
                                                avatarType: 'avatar'
                                              });
                                              setShowVideoConfigModal(variant);
                                            }}
                                            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/50 rounded-xl text-[10px] font-bold text-white transition-colors"
                                          >
                                            Generate Again
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setVideoConfig({
                                            script: (variant.caption || '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
                                            avatarId: '',
                                            avatarType: 'avatar'
                                          });
                                          setShowVideoConfigModal(variant);
                                        }}
                                        disabled={generatingVideo === variant.id}
                                        className="w-full aspect-video rounded-3xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 group hover:bg-white/10 transition-all"
                                      >
                                        <div className="h-12 w-12 rounded-2xl bg-white/5 group-hover:bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-all">
                                          <Video className="h-6 w-6 text-white/10 group-hover:text-orange-400" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase text-white/30 group-hover:text-white">Configure AI Video</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      <AnimatePresence>
        {/* Buffer Publish Modal */}
        {showPublishModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg rounded-[40px] bg-[#1a1c20] border border-white/10 p-10 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20"><Send className="h-7 w-7 text-orange-400" /></div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Publish Content</h3>
                  <p className="text-white/40 text-sm">Select Buffer channels</p>
                </div>
              </div>

              {bufferChannels.length === 0 ? (
                <div className="py-10 text-center bg-white/5 rounded-3xl border border-white/5 mb-8">
                  <p className="text-sm text-white/40 mb-4">No connected channels found.</p>
                  <a href="https://publish.buffer.com/settings/api" target="_blank" rel="noreferrer" className="text-xs font-black text-orange-400 uppercase tracking-widest hover:text-orange-300">Open Buffer Settings →</a>
                </div>
              ) : (
                <div className="space-y-4 mb-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {bufferChannels.map(channel => (
                    <label key={channel.id} className={`flex items-center gap-4 p-4 rounded-3xl border cursor-pointer transition-all ${selectedChannels.includes(channel.id) ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                      <input 
                        type="checkbox" checked={selectedChannels.includes(channel.id)}
                        onChange={e => e.target.checked ? setSelectedChannels(p => [...p, channel.id]) : setSelectedChannels(p => p.filter(id => id !== channel.id))}
                        className="h-5 w-5 rounded-lg border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                      />
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${platformInfo[channel.service]?.color || 'from-white/10 to-white/5'} flex items-center justify-center`}>
                        {platformInfo[channel.service]?.icon ? <Monitor className="h-5 w-5 text-white" /> : <Megaphone className="h-5 w-5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-white">{channel.name}</div>
                        <div className="text-[10px] font-black uppercase text-white/20 tracking-widest">{channel.service}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={handlePublish} disabled={!selectedChannels.length || !!publishing}
                  className="flex-1 h-14 rounded-2xl bg-orange-500 text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  {publishing ? <RefreshCw className="h-5 w-5 animate-spin mx-auto" /> : 'Confirm & Schedule'}
                </button>
                <button onClick={() => setShowPublishModal(null)} className="flex-1 h-14 rounded-2xl bg-white/5 font-black text-sm text-white/40 hover:text-white transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* AI Video Configuration Modal */}
        {showVideoConfigModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[40px] bg-[#1a1c20] border border-white/10 p-8 md:p-10 shadow-2xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20"><Video className="h-7 w-7 text-orange-400" /></div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">AI Video Studio</h3>
                  <p className="text-white/40 text-sm italic">"Metadata: Webhook Integration Enabled"</p>
                </div>
              </div>

              <div className="grid md:grid-cols-[200px,1fr] gap-10">
                <div className="space-y-6">
                    <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 text-center">
                      <Users className="h-10 w-10 text-orange-400 mx-auto mb-4" />
                      <h4 className="text-sm font-bold text-white mb-2">Configure Actor</h4>
                      <p className="text-xs text-white/40 mb-6">Enter your custom HeyGen Avatar ID or Photo ID below to generate the video.</p>
                      
                      <div className="relative">
                        <input 
                          type="text" 
                          value={videoConfig.avatarId}
                          onChange={e => setVideoConfig(p => ({ ...p, avatarId: e.target.value }))}
                          placeholder="Enter HeyGen Avatar ID (e.g. 054b...)"
                          className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-4 text-sm text-center text-orange-400 font-mono focus:border-orange-500/50 outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="mt-4 text-[10px] text-white/20 italic">"Ensure the ID matches an asset in your HeyGen account"</div>
                      
                      <div className="mt-6 text-left">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2 block">Asset Type</label>
                        <select
                          value={videoConfig.avatarType}
                          onChange={e => setVideoConfig(p => ({ ...p, avatarType: e.target.value as 'avatar' | 'talking_photo' }))}
                          className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                        >
                          <option value="avatar">Video Avatar (Default)</option>
                          <option value="talking_photo">Talking Photo</option>
                        </select>
                      </div>
                    </div>
                  </div>
    
                  <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                    <span className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] block mb-2">Selected ID</span>
                    <code className="text-[10px] text-orange-400/80 font-mono break-all leading-tight bg-orange-500/5 px-2 py-1 rounded-md border border-orange-500/10 block">
                      {videoConfig.avatarId || 'None'}
                    </code>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest ml-1">
                      <span className="text-white/20">Spoken Script</span>
                      <span className={videoConfig.script.length > 500 ? 'text-rose-500' : 'text-white/40'}>{videoConfig.script.length}/500</span>
                    </div>
                    <textarea 
                      value={videoConfig.script} 
                      onChange={e => setVideoConfig(p => ({ ...p, script: e.target.value }))}
                      className="w-full h-48 rounded-3xl bg-white/5 border border-white/5 p-6 text-sm text-white/80 leading-relaxed outline-none focus:border-orange-500/50 transition-all resize-none"
                    />
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                      <AlertCircle className="h-4 w-4 text-orange-400 shrink-0" />
                      <p className="text-[10px] font-bold text-orange-400/80 leading-tight">The avatar will speak this exact text. Check for natural phrasing!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button 
                  onClick={() => handleGenerateVideo(showVideoConfigModal)} 
                  disabled={generatingVideo === showVideoConfigModal.id || !videoConfig.script}
                  className="flex-1 h-14 rounded-2xl bg-orange-500 text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  {generatingVideo === showVideoConfigModal.id ? <RefreshCw className="h-5 w-5 animate-spin mx-auto" /> : 'Initialize Render'}
                </button>
                <button onClick={() => setShowVideoConfigModal(null)} className="flex-1 h-14 rounded-2xl bg-white/5 font-black text-sm text-white/40 hover:text-white transition-all">Discard</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.2);
        }
      `}</style>
    </div>
  );
}
