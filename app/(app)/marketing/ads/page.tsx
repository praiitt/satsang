'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/livekit/button';
import { getCurrentUser } from '@/lib/auth-api';
import { MarketingAgentInterface } from '@/components/marketing/marketing-agent-interface';
import { Download, Copy, Send, Sparkles, Image, Video, Trash2, ChevronDown, ChevronUp, RefreshCw, ExternalLink, Bot, Play, Edit3 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const platformIcon: Record<string, string> = {
    instagram: '📷',
    twitter: '🐦',
    linkedin: '💼',
    facebook: '👥',
};

const serviceColor: Record<string, string> = {
    instagram: 'from-purple-500 to-pink-500',
    twitter: 'from-sky-400 to-blue-500',
    linkedin: 'from-blue-600 to-blue-800',
    facebook: 'from-blue-500 to-indigo-600',
    tiktok: 'from-black to-red-600',
    pinterest: 'from-red-500 to-red-700',
};

const AVATAR_OPTIONS = [
    { id: 'f31ce977d65e47caa3e92a46703d6b1f', name: 'Rraasi Brand Avatar', type: 'Talking Photo' },
    { id: 'Anna_public_3_20240108', name: 'Anna (Professional)', type: 'Video Avatar' },
    { id: 'Susan_public_2_20240108', name: 'Susan (Casual)', type: 'Video Avatar' },
    { id: 'Edward_public_1_20240108', name: 'Edward (Corporate)', type: 'Video Avatar' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdsPage() {
    const [briefs, setBriefs] = useState<AdBrief[]>([]);
    const [selectedBrief, setSelectedBrief] = useState<AdBrief | null>(null);
    const [variants, setVariants] = useState<AdVariant[]>([]);
    const [bufferChannels, setBufferChannels] = useState<BufferChannel[]>([]);
    const [bufferConfigured, setBufferConfigured] = useState(false);

    const [loading, setLoading] = useState(false);
    const [loadingVariants, setLoadingVariants] = useState(false);
    const [generatingText, setGeneratingText] = useState(false);
    const [generatingImage, setGeneratingImage] = useState<string | null>(null); // variantId
    const [generatingVideo, setGeneratingVideo] = useState<string | null>(null); // variantId
    const activePolls = useRef(new Set<string>());
    const [publishing, setPublishing] = useState<string | null>(null); // variantId
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [notLoggedIn, setNotLoggedIn] = useState(false);
    const [imageProvider, setImageProvider] = useState<'gemini' | 'dalle'>('dalle');

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState<AdVariant | null>(null);
    const [showVideoConfigModal, setShowVideoConfigModal] = useState<AdVariant | null>(null);
    const [videoConfig, setVideoConfig] = useState({ script: '', avatarId: '' });
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [scheduledAt, setScheduledAt] = useState('');

    const [showAgent, setShowAgent] = useState(false);
    const [agentToken, setAgentToken] = useState('');
    const [agentUrl, setAgentUrl] = useState('');

    const [selectedPlatform, setSelectedPlatform] = useState('instagram');

    const [form, setForm] = useState({
        title: '',
        topic: '',
        objective: 'Awareness',
        audience: 'Spiritual seekers aged 25-45 in India',
        cta: 'Download the Rraasi app',
        tone: 'inspirational',
        language: 'english',
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
            } catch (e) {}

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

    // ─── Load Briefs ──────────────────────────────────────────────────────────
    const loadBriefs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/briefs`, { credentials: 'include' });
            if (res.status === 401) { setNotLoggedIn(true); return; }
            setNotLoggedIn(false);
            if (!res.ok) {
                const text = await res.text();
                let errMsg = `Error ${res.status}`;
                try {
                    const data = JSON.parse(text);
                    errMsg = data.error || data.details || errMsg;
                } catch {
                    errMsg = text.slice(0, 100) || errMsg;
                }
                throw new Error(errMsg);
            }
            const data = await res.json();
            setBriefs(data.items || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

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
                    clearInterval(interval);
                    activePolls.current.delete(videoId);
                    await loadVariants(briefId);
                }
            } catch (e) {
                console.error('Error polling video status:', e);
                clearInterval(interval);
                activePolls.current.delete(videoId);
            }
        }, 5000);
    };

    const loadVariants = async (briefId: string) => {
        try {
            setLoadingVariants(true);
            const res = await fetch(`${API}/briefs/${briefId}/variants`, { credentials: 'include' });
            if (!res.ok) throw new Error(`Failed to load variants: ${res.status}`);
            const data = await res.json();
            const items = data.items || [];
            setVariants(items);

            // Auto-poll for processing videos
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
            if (!res.ok) {
                console.warn(`Buffer channels fetch failed with status ${res.status}`);
                setBufferConfigured(false);
                return;
            }
            const data = await res.json();
            setBufferConfigured(data.configured || false);
            setBufferChannels(data.channels || []);
        } catch {
            // Buffer not configured
        }
    };

    useEffect(() => {
        loadBriefs();
        loadBufferChannels();
    }, []);

    useEffect(() => {
        if (selectedBrief) loadVariants(selectedBrief.id);
        else setVariants([]);
    }, [selectedBrief]);

    // ─── Create Brief ─────────────────────────────────────────────────────────
    const handleCreateBrief = async () => {
        if (!form.title || !form.topic || !form.objective) {
            setError('Title, Topic, and Objective are required.');
            return;
        }
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
            if (!res.ok) throw new Error(data.error);
            await loadBriefs();
            setSelectedBrief(data);
            setShowCreateForm(false);
            setForm({ ...form, title: '', topic: '' });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Generate Text Content ────────────────────────────────────────────────
    const handleGenerateContent = async () => {
        if (!selectedBrief) return;
        try {
            setGeneratingText(true);
            setError(null);
            const headers = await authHeaders();
            const res = await fetch(`${API}/briefs/${selectedBrief.id}/generate`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ platform: selectedPlatform }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);
            await loadVariants(selectedBrief.id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGeneratingText(false);
        }
    };

    // ─── Generate Image ───────────────────────────────────────────────────────
    const handleGenerateImage = async (variant: AdVariant) => {
        if (!selectedBrief) return;
        try {
            setGeneratingImage(variant.id);
            setError(null);
            const headers = await authHeaders();
            const res = await fetch(`${API}/briefs/${selectedBrief.id}/generate-image`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    variantId: variant.id,
                    imagePrompt: variant.imagePrompt,
                    provider: imageProvider
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);
            await loadVariants(selectedBrief.id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGeneratingImage(null);
        }
    };

    // ─── Generate HeyGen Video ───────────────────────────────────────────────
    const handleGenerateVideo = async (variant: AdVariant) => {
        if (!selectedBrief) return;
        try {
            setGeneratingVideo(variant.id);
            setError(null);
            setShowVideoConfigModal(null);
            const headers = await authHeaders();
            const res = await fetch(`${API}/briefs/${selectedBrief.id}/generate-video`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ 
                    variantId: variant.id,
                    avatarId: videoConfig.avatarId,
                    customScript: videoConfig.script
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);

            // Re-load to get the videoId
            await loadVariants(selectedBrief.id);

            // Start polling if not ready immediately
            if (data.status !== 'ready' && data.videoId) {
                startPollingVideo(selectedBrief.id, variant.id, data.videoId);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGeneratingVideo(null);
        }
    };

    // ─── Delete Variant ───────────────────────────────────────────────────────
    const handleDeleteVariant = async (variantId: string) => {
        if (!selectedBrief) return;
        if (!confirm('Delete this variant?')) return;
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

    // ─── Copy to clipboard ───────────────────────────────────────────────────
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    // ─── Download Image ───────────────────────────────────────────────────────
    const handleDownloadImage = async (imageUrl: string, variantId: string) => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `rraasi-ad-${variantId}.jpg`;
        a.target = '_blank';
        a.click();
    };

    // ─── Publish to Buffer ────────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!selectedBrief || !showPublishModal || !selectedChannels.length) return;
        try {
            setPublishing(showPublishModal.id);
            setError(null);
            const headers = await authHeaders();
            const res = await fetch(`${API}/briefs/${selectedBrief.id}/publish`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    variantId: showPublishModal.id,
                    channelIds: selectedChannels,
                    scheduledAt: scheduledAt || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);
            setShowPublishModal(null);
            setSelectedChannels([]);
            await loadVariants(selectedBrief.id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setPublishing(null);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    const textVariants = variants.filter(v => v.type === 'text');
    const imageVariants = variants.filter(v => v.type === 'image');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
            <div className="mx-auto max-w-7xl p-6">
                {/* ── Header ── */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Social Media Ads Studio
                        </h1>
                        <p className="mt-2 text-slate-400">
                            Generate AI-powered social media posts and publish directly via Buffer
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {bufferConfigured ? (
                            <div className="flex items-center gap-2 rounded-full bg-green-900/40 border border-green-500/30 px-3 py-1.5 text-xs text-green-400">
                                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                Buffer Connected
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <a
                                    href="https://publish.buffer.com/settings/api"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 rounded-full bg-slate-800 border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Connect Buffer
                                </a>
                                <button
                                    onClick={loadBufferChannels}
                                    title="Retry Buffer connection"
                                    className="rounded-full bg-slate-800 border border-slate-700 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                        <Button
                            onClick={showAgent ? () => setShowAgent(false) : startAgent}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                        >
                            <Bot className="mr-2 h-4 w-4" />
                            {showAgent ? 'Close Assistant' : 'Ask Chitragupta'}
                        </Button>
                        <Button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            New Campaign
                        </Button>
                    </div>
                </div>

                {/* ── Not Logged In ── */}
                {notLoggedIn && (
                    <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300 flex items-center gap-3">
                        <span>🔑</span>
                        <span>Please <a href="/login" className="underline hover:text-yellow-200">log in</a> to access your campaigns.</span>
                    </div>
                )}

                {/* ── Error ── */}
                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                        ⚠️ {error}
                        <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">×</button>
                    </div>
                )}

                {/* ── Marketing Agent ── */}
                {showAgent && agentToken && agentUrl && (
                    <div className="mb-8">
                        <MarketingAgentInterface
                            accessToken={agentToken}
                            url={agentUrl}
                            onDisconnect={() => setShowAgent(false)}
                        />
                    </div>
                )}

                {/* ── Create Form ── */}
                {showCreateForm && (
                    <div className="mb-8 rounded-2xl border border-violet-500/20 bg-slate-900/60 backdrop-blur-sm p-6">
                        <h2 className="mb-4 text-lg font-semibold text-violet-300">New Ad Campaign Brief</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Campaign Title *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Satsang App Launch"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Topic / Theme *</label>
                                <input
                                    type="text"
                                    value={form.topic}
                                    onChange={e => setForm({ ...form, topic: e.target.value })}
                                    placeholder="e.g. Daily Spiritual Satsang & Meditation"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Objective *</label>
                                <select
                                    value={form.objective}
                                    onChange={e => setForm({ ...form, objective: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                                >
                                    {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Target Audience</label>
                                <input
                                    type="text"
                                    value={form.audience}
                                    onChange={e => setForm({ ...form, audience: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Call to Action</label>
                                <input
                                    type="text"
                                    value={form.cta}
                                    onChange={e => setForm({ ...form, cta: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Tone</label>
                                <div className="flex flex-wrap gap-2">
                                    {TONES.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setForm({ ...form, tone: t })}
                                            className={`rounded-full px-3 py-1 text-xs transition-colors ${form.tone === t
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Language</label>
                                <div className="flex gap-2">
                                    {LANGUAGES.map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setForm({ ...form, language: l })}
                                            className={`rounded-full px-3 py-1 text-xs transition-colors capitalize ${form.language === l
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Target Platforms</label>
                                <div className="flex gap-2">
                                    {PLATFORMS.map(p => (
                                        <button
                                            key={p}
                                            onClick={() =>
                                                setForm(prev => ({
                                                    ...prev,
                                                    channels: prev.channels.includes(p)
                                                        ? prev.channels.filter(c => c !== p)
                                                        : [...prev.channels, p],
                                                }))
                                            }
                                            className={`rounded-lg px-3 py-1 text-xs transition-colors ${form.channels.includes(p)
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            {platformIcon[p]} {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <Button onClick={handleCreateBrief} disabled={loading} className="bg-violet-600 hover:bg-violet-700">
                                {loading ? '⏳ Creating...' : '✨ Create Campaign'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
                    {/* ── Brief List ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Campaigns</h2>
                            <button onClick={loadBriefs} className="text-slate-500 hover:text-slate-300 transition-colors">
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading && !briefs.length ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
                        ) : briefs.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                                <Sparkles className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                                <p className="text-sm text-slate-500">No campaigns yet.</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="mt-2 text-xs text-violet-400 hover:text-violet-300"
                                >
                                    Create your first one →
                                </button>
                            </div>
                        ) : (
                            briefs.map(brief => (
                                <button
                                    key={brief.id}
                                    onClick={() => setSelectedBrief(brief.id === selectedBrief?.id ? null : brief)}
                                    className={`w-full rounded-xl border p-4 text-left transition-all ${selectedBrief?.id === brief.id
                                        ? 'border-violet-500/50 bg-violet-900/20 shadow-lg shadow-violet-900/20'
                                        : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                                        }`}
                                >
                                    <div className="mb-1 font-medium text-white text-sm">{brief.title}</div>
                                    <div className="text-xs text-slate-400 mb-2">{brief.topic}</div>
                                    <div className="flex gap-1 flex-wrap">
                                        {(brief.channels || []).map(c => (
                                            <span key={c} className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                                                {platformIcon[c] || '🌐'} {c}
                                            </span>
                                        ))}
                                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${brief.objective === 'App Downloads'
                                            ? 'bg-green-900/40 text-green-400'
                                            : 'bg-blue-900/40 text-blue-400'
                                            }`}>
                                            {brief.objective}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* ── Workspace ── */}
                    <div>
                        {!selectedBrief ? (
                            <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-slate-700">
                                <div className="text-center">
                                    <Sparkles className="mx-auto mb-3 h-12 w-12 text-violet-500/40" />
                                    <p className="text-slate-500">Select a campaign to start generating</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Brief Summary */}
                                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{selectedBrief.title}</h2>
                                            <p className="text-sm text-slate-400 mt-1">{selectedBrief.topic}</p>
                                            <div className="mt-2 flex gap-2 flex-wrap text-xs">
                                                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                                                    🎯 {selectedBrief.objective}
                                                </span>
                                                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                                                    🗣️ {selectedBrief.tone}
                                                </span>
                                                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                                                    🌐 {selectedBrief.language}
                                                </span>
                                                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                                                    📣 {selectedBrief.cta}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Generate Controls */}
                                <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-pink-900/20 p-5">
                                    <h3 className="mb-4 font-semibold text-violet-300">🤖 AI Generation</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Platform</label>
                                            <div className="flex gap-2">
                                                {PLATFORMS.map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setSelectedPlatform(p)}
                                                        className={`rounded-lg px-3 py-2 text-sm transition-all ${selectedPlatform === p
                                                            ? 'bg-gradient-to-r ' + (serviceColor[p] || 'from-violet-600 to-pink-600') + ' text-white shadow-lg'
                                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {platformIcon[p]} {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="ml-auto flex gap-3">
                                            <Button
                                                onClick={handleGenerateContent}
                                                disabled={generatingText}
                                                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
                                            >
                                                {generatingText ? (
                                                    <>
                                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="mr-2 h-4 w-4" />
                                                        Generate Caption & Tags
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Variants */}
                                {loadingVariants ? (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />
                                        Loading posts...
                                    </div>
                                ) : textVariants.length === 0 && imageVariants.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
                                        No posts generated yet. Click "Generate Caption & Tags" to start.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium uppercase tracking-wider text-slate-400">
                                            Generated Posts ({textVariants.length})
                                        </h3>
                                        {textVariants.map(variant => {
                                            const linkedImage = imageVariants.find(
                                                iv => (iv as any).linkedVariantId === variant.id
                                            );
                                            const captionWithTags = [
                                                variant.caption || '',
                                                variant.hashtags?.length
                                                    ? variant.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ')
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join('\n\n');

                                            return (
                                                <div
                                                    key={variant.id}
                                                    className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden"
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{platformIcon[variant.platform || 'instagram']}</span>
                                                            <span className="text-xs font-medium text-slate-300 capitalize">{variant.platform}</span>
                                                            {variant.publishStatus === 'published' && (
                                                                <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">
                                                                    ✓ Published
                                                                </span>
                                                            )}
                                                            {variant.publishStatus === 'partial' && (
                                                                <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-400">
                                                                    ⚠ Partial Success
                                                                </span>
                                                            )}
                                                            {variant.publishStatus === 'failed' && (
                                                                <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-400">
                                                                    ✕ Failed
                                                                </span>
                                                            )}
                                                            {variant.publishStatus === 'failed' && variant.lastPublishError && (
                                                                <span className="ml-2 text-[10px] text-red-500/80 italic line-clamp-1 max-w-[150px]" title={variant.lastPublishError}>
                                                                    {variant.lastPublishError}
                                                                </span>
                                                            )}
                                                            {variant.publishStatus === 'partial' && variant.lastPublishError && (
                                                                <span className="ml-2 text-[10px] text-yellow-500/80 italic line-clamp-1 max-w-[150px]" title={variant.lastPublishError}>
                                                                    {variant.lastPublishError}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-500">
                                                                {new Date(variant.createdAt).toLocaleDateString()}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDeleteVariant(variant.id)}
                                                                className="text-slate-600 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-5 grid gap-4 md:grid-cols-[1fr,200px]">
                                                        <div className="space-y-4">
                                                            {/* Hook Lines */}
                                                            {variant.hooks && variant.hooks.length > 0 && (
                                                                <div>
                                                                    <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Hook Options</p>
                                                                    <div className="space-y-1.5">
                                                                        {variant.hooks.map((hook, i) => (
                                                                            <div key={i} className="flex items-start gap-2 rounded-lg bg-slate-800/60 px-3 py-2">
                                                                                <span className="mt-0.5 text-xs text-violet-400 font-bold">{i + 1}</span>
                                                                                <p className="text-sm text-slate-300 flex-1">{hook}</p>
                                                                                <button
                                                                                    onClick={() => handleCopy(hook, `hook-${variant.id}-${i}`)}
                                                                                    className="text-slate-600 hover:text-slate-400 shrink-0"
                                                                                >
                                                                                    {copied === `hook-${variant.id}-${i}` ? '✓' : <Copy className="h-3 w-3" />}
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Caption */}
                                                            {variant.caption && (
                                                                <div>
                                                                    <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Caption</p>
                                                                    <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                                                                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                                                                            {variant.caption}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Hashtags */}
                                                            {variant.hashtags && variant.hashtags.length > 0 && (
                                                                <div>
                                                                    <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Hashtags</p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {variant.hashtags.map((tag, i) => (
                                                                            <span
                                                                                key={i}
                                                                                className="rounded-full bg-indigo-900/40 border border-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300"
                                                                            >
                                                                                {tag.startsWith('#') ? tag : `#${tag}`}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Action Buttons */}
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleCopy(captionWithTags, `caption-${variant.id}`)}
                                                                    className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                                                                >
                                                                    {copied === `caption-${variant.id}` ? '✓ Copied!' : (
                                                                        <><Copy className="mr-1.5 h-3 w-3" />Copy All</>
                                                                    )}
                                                                </Button>

                                                                {bufferConfigured && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setShowPublishModal(variant);
                                                                            setSelectedChannels(variant.publishedToChannels || []);
                                                                        }}
                                                                        className={variant.publishStatus === 'failed' || variant.publishStatus === 'partial' 
                                                                            ? "bg-amber-600 hover:bg-amber-700 text-white border-0 text-xs"
                                                                            : "bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 text-xs"
                                                                        }
                                                                    >
                                                                        {variant.publishStatus === 'failed' || variant.publishStatus === 'partial' ? (
                                                                            <RefreshCw className="mr-1.5 h-3 w-3" />
                                                                        ) : (
                                                                            <Send className="mr-1.5 h-3 w-3" />
                                                                        )}
                                                                        {variant.publishStatus === 'failed' || variant.publishStatus === 'partial' ? 'Retry Publishing' : 'Post via Buffer'}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {linkedImage?.imageUrl || (variant as any).imageUrl ? (
                                                                <div>
                                                                    <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">AI Image</p>
                                                                    <img
                                                                        src={linkedImage?.imageUrl || (variant as any).imageUrl}
                                                                        alt="Generated ad"
                                                                        className="w-full rounded-xl object-cover aspect-square"
                                                                    />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDownloadImage(
                                                                            linkedImage?.imageUrl || (variant as any).imageUrl,
                                                                            variant.id
                                                                        )}
                                                                        className="mt-2 w-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                                                                    >
                                                                        <Download className="mr-2 h-3 w-3" />
                                                                        Download Image
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">AI Image</p>
                                                                        <select
                                                                            value={imageProvider}
                                                                            onChange={(e) => setImageProvider(e.target.value as any)}
                                                                            className="ml-auto bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-400 focus:outline-none focus:border-violet-500"
                                                                        >
                                                                            <option value="gemini">Gemini</option>
                                                                            <option value="dalle">DALL-E 3</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="aspect-square w-full rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 bg-slate-800/30">
                                                                        <Image className="h-8 w-8 text-slate-600" />
                                                                        <p className="text-xs text-slate-600 text-center px-2">
                                                                            {variant.imagePrompt ? 'Ready to generate' : 'No image yet'}
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleGenerateImage(variant)}
                                                                        disabled={generatingImage === variant.id}
                                                                        className={`mt-2 w-full text-white border-0 text-xs ${imageProvider === 'dalle' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-pink-600 hover:bg-pink-700'
                                                                            }`}
                                                                    >
                                                                        {generatingImage === variant.id ? (
                                                                            <>
                                                                                <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                                                Generating...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Sparkles className="mr-1.5 h-3 w-3" />
                                                                                Generate with {imageProvider === 'dalle' ? 'DALL-E' : 'Gemini'}
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                    {variant.imagePrompt && (
                                                                        <p className="mt-1 text-xs text-slate-600 italic line-clamp-2">
                                                                            {variant.imagePrompt.slice(0, 80)}...
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* AI Video section */}
                                                            <div className="pt-2 border-t border-slate-800/50 mt-2">
                                                                {variant.videoUrl ? (
                                                                    <div>
                                                                        <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Talking Avatar Video</p>
                                                                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-700">
                                                                            <video 
                                                                                src={variant.videoUrl} 
                                                                                controls 
                                                                                className="w-full h-full object-contain"
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => window.open(variant.videoUrl, '_blank')}
                                                                            className="mt-2 w-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                                                                        >
                                                                            <ExternalLink className="mr-2 h-3 w-3" />
                                                                            View Full Video
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Talking Avatar Video</p>
                                                                            {variant.videoStatus === 'processing' && (
                                                                                <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                                                                                    <span className="text-[10px] text-violet-300 font-medium">Generating...</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {!variant.videoUrl && variant.videoStatus !== 'processing' ? (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => {
                                                                                    setVideoConfig({
                                                                                        script: (variant.caption || '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
                                                                                        avatarId: AVATAR_OPTIONS[0].id
                                                                                    });
                                                                                    setShowVideoConfigModal(variant);
                                                                                }}
                                                                                disabled={generatingVideo === variant.id}
                                                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-xs shadow-lg shadow-indigo-500/20"
                                                                            >
                                                                                <Sparkles className="mr-1.5 h-3 w-3" />
                                                                                Configure AI Video
                                                                            </Button>
                                                                        ) : variant.videoStatus === 'processing' ? (
                                                                            <div className="aspect-video w-full rounded-xl border border-dashed border-violet-500/30 flex flex-col items-center justify-center gap-2 bg-violet-500/5 backdrop-blur-sm">
                                                                                <Bot className="h-8 w-8 text-violet-400 animate-bounce" />
                                                                                <p className="text-[11px] text-violet-300 font-medium px-4 text-center">
                                                                                    Render in progress (~1-2 min)
                                                                                </p>
                                                                                <p className="text-[9px] text-slate-500">
                                                                                    Avatar is speaking your caption
                                                                                </p>
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Publish Modal ── */}
            {showPublishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-violet-500/20 bg-slate-900 p-6 shadow-2xl">
                        <h3 className="mb-4 text-lg font-bold text-white">🚀 Publish via Buffer</h3>

                        {bufferChannels.length === 0 ? (
                            <div className="text-sm text-slate-400">
                                No Buffer channels found. Make sure Buffer is configured and you have connected channels.
                                <a href="https://publish.buffer.com/settings/api" target="_blank" rel="noreferrer"
                                    className="block mt-2 text-violet-400 hover:text-violet-300">
                                    Go to Buffer Settings →
                                </a>
                            </div>
                        ) : (
                            <>
                                <p className="mb-3 text-sm text-slate-400">Select accounts to post to:</p>
                                <div className="space-y-2 mb-4">
                                    {bufferChannels.map(channel => (
                                        <label key={channel.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 cursor-pointer hover:border-slate-600 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedChannels.includes(channel.id)}
                                                onChange={e =>
                                                    e.target.checked
                                                        ? setSelectedChannels(prev => [...prev, channel.id])
                                                        : setSelectedChannels(prev => prev.filter(id => id !== channel.id))
                                                }
                                                className="accent-violet-500"
                                            />
                                            <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${serviceColor[channel.service] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-xs`}>
                                                {platformIcon[channel.service] || '🌐'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{channel.name}</div>
                                                <div className="text-xs text-slate-500 capitalize">{channel.service}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <div className="mb-4 space-y-1">
                                    <label className="text-xs text-slate-400">Schedule (optional — leave empty to add to queue)</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={e => setScheduledAt(e.target.value)}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex gap-3">
                            <Button
                                onClick={handlePublish}
                                disabled={!selectedChannels.length || !!publishing}
                                className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0"
                            >
                                {publishing ? (
                                    <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Publishing...</>
                                ) : (
                                    <><Send className="mr-2 h-4 w-4" />Publish Now</>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setShowPublishModal(null)}
                                className="border-slate-700 text-slate-300">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Video Configuration Modal ── */}
            {showVideoConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-indigo-500/20 bg-slate-900 p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Sparkles className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Configure AI Video</h3>
                                <p className="text-xs text-slate-400">Customize the script and avatar for your video.</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                                    <Video className="h-3 w-3" /> Select Avatar
                                </label>
                                <select 
                                    value={videoConfig.avatarId} 
                                    onChange={e => setVideoConfig(prev => ({ ...prev, avatarId: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                >
                                    {AVATAR_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name} ({opt.type})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
                                    <span className="flex items-center gap-1.5"><Edit3 className="h-3 w-3" /> Spoken Script</span>
                                    <span className={videoConfig.script.length > 500 ? 'text-red-400' : ''}>{videoConfig.script.length}/500 chars</span>
                                </label>
                                <textarea
                                    value={videoConfig.script}
                                    onChange={(e) => setVideoConfig(prev => ({ ...prev, script: e.target.value }))}
                                    rows={6}
                                    maxLength={500}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                                />
                                <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                                    This text will be spoken exactly as written by the avatar. Make sure it sounds natural. Maximum 500 characters.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => handleGenerateVideo(showVideoConfigModal)}
                                disabled={!videoConfig.script || videoConfig.script.length > 500 || generatingVideo === showVideoConfigModal.id}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                            >
                                {generatingVideo === showVideoConfigModal.id ? (
                                    <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating...</>
                                ) : (
                                    <><Video className="mr-2 h-4 w-4" />Start Generation</>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setShowVideoConfigModal(null)}
                                className="border-slate-700 text-slate-300">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
