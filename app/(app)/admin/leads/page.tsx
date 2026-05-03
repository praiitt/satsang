'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Search, RefreshCw, Play, MessageCircle, Globe, Lock,
    Instagram, Youtube, Filter, TrendingUp, Users, CheckCircle, Send,
    Star, Trash2, Sparkles, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Lead {
    id: string;
    name: string;
    handle: string;
    platform: 'instagram' | 'youtube' | 'medium' | 'reddit';
    profileUrl: string;
    language: string;
    location: string;
    phone: string | null;
    whatsappUrl: string | null;
    email: string | null;
    website: string | null;
    bestContactMethod: string;
    samplePoem: string;
    tags: string[];
    poetScore: number;
    status: 'new' | 'contacted' | 'demo_sent' | 'converted' | 'rejected';
    notes: string;
    sampleGenerated: boolean;
    sampleUrl: string | null;
    discoveredAt: number;
    isFavorite?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    demo_sent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    converted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400',
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
    instagram: <Instagram className="w-4 h-4 text-pink-500" />,
    youtube: <Youtube className="w-4 h-4 text-red-500" />,
    medium: <Globe className="w-4 h-4 text-green-500" />,
    reddit: <Globe className="w-4 h-4 text-orange-500" />,
};

export default function LeadsAdminPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 });
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [scrapeModal, setScrapeModal] = useState(false);
    const [scrapeSource, setScrapeSource] = useState<'instagram' | 'youtube'>('instagram');
    const [scrapeHashtags, setScrapeHashtags] = useState('BhajanWriter,HindiPoetry,Shayari');
    const [scraping, setScraping] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [generatingTags, setGeneratingTags] = useState(false);
    const [filter, setFilter] = useState({ platform: 'all', status: 'all', search: '' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({
                ...(filter.platform !== 'all' && { platform: filter.platform }),
                ...(filter.status !== 'all' && { status: filter.status }),
                limit: '100'
            }).toString();
            const res = await fetch(`/api/leads?${qs}`);
            const data = await res.json();
            setLeads(data.items || []);
        } catch (e) {
            console.error('Failed to fetch leads:', e);
        } finally {
            setLoading(false);
        }
    }, [filter.platform, filter.status]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/leads?limit=1');
            const data = await res.json();
            setStats(s => ({ ...s, total: data.total || 0 }));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchLeads();
        fetchStats();
    }, [fetchLeads, fetchStats]);

    const toggleFavorite = async (lead: Lead) => {
        const newFav = !lead.isFavorite;
        // Optimistic UI update
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, isFavorite: newFav } : l));
        if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, isFavorite: newFav });

        try {
            await fetch(`/api/leads/${lead.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: newFav })
            });
        } catch {
            fetchLeads(); // Revert on failure
        }
    };

    const deleteLead = async (lead: Lead) => {
        if (!confirm(`Are you sure you want to delete ${lead.name}?`)) return;
        try {
            await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
            if (selectedLead?.id === lead.id) setSelectedLead(null);
            fetchLeads();
        } catch {
            alert('Failed to delete lead');
        }
    };

    const triggerScrape = async () => {
        setScraping(true);
        try {
            await fetch('/api/leads/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: scrapeSource,
                    hashtags: scrapeSource === 'instagram' ? scrapeHashtags.split(',').map(h => h.trim()) : undefined,
                    channelIds: scrapeSource === 'youtube' ? scrapeHashtags.split(',').map(h => h.trim()) : undefined,
                })
            });
            setScrapeModal(false);
            alert(`✅ Scrape started for ${scrapeSource}! New leads will appear in a few minutes.`);
        } catch {
            alert('Failed to start scrape');
        } finally {
            setScraping(false);
        }
    };

    const generateTags = async () => {
        if (!aiPrompt.trim()) return;
        setGeneratingTags(true);
        try {
            const res = await fetch('/api/leads/scrape/generate-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt, platform: scrapeSource })
            });
            const data = await res.json();
            if (data.tags) {
                setScrapeHashtags(data.tags);
                setAiPrompt('');
            } else {
                alert('No tags generated.');
            }
        } catch {
            alert('Failed to generate tags. Please try again.');
        } finally {
            setGeneratingTags(false);
        }
    };

    const generateSample = async (lead: Lead) => {
        setActionLoading(`sample-${lead.id}`);
        try {
            await fetch(`/api/leads/${lead.id}/generate-sample`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            alert('🎵 Sample generation started! Check back in ~2 minutes.');
            fetchLeads();
        } catch {
            alert('Failed to generate sample');
        } finally {
            setActionLoading(null);
        }
    };

    const sendWhatsApp = async (lead: Lead) => {
        if (!lead.phone) { alert('No phone number for this lead.'); return; }
        setActionLoading(`wa-${lead.id}`);
        try {
            await fetch(`/api/leads/${lead.id}/send-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            alert(`✅ WhatsApp sent to ${lead.name}!`);
            fetchLeads();
        } catch {
            alert('Failed to send WhatsApp');
        } finally {
            setActionLoading(null);
        }
    };

    const updateStatus = async (lead: Lead, status: string) => {
        await fetch(`/api/leads/${lead.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        fetchLeads();
    };

    const filteredLeads = leads.filter(l =>
        !filter.search ||
        l.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        l.handle.toLowerCase().includes(filter.search.toLowerCase())
    );




    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎵 Poet Lead Engine</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Discover spiritual poets and convert them to RRAASI creators</p>
                </div>
            <div className="flex gap-2">
                    <a href="/admin/users">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                            👤 Users
                        </Button>
                    </a>
                    <a href="/admin/facebook-leads">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                            📘 Facebook Leads
                        </Button>
                    </a>
                    <Button variant="dotted" onClick={fetchLeads} disabled={loading} className="text-amber-500 border-amber-500/30">
                        <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Refresh
                    </Button>
                    <Button onClick={() => setScrapeModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white border-none">
                        <Search className="w-4 h-4 mr-2" /> Start Scrape
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Leads', value: leads.length, icon: <Users className="w-5 h-5 text-amber-500" /> },
                    { label: 'New', value: leads.filter(l => l.status === 'new').length, icon: <TrendingUp className="w-5 h-5 text-blue-500" /> },
                    { label: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, icon: <MessageCircle className="w-5 h-5 text-purple-500" /> },
                    { label: 'Converted', value: leads.filter(l => l.status === 'converted').length, icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">{stat.icon}<span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span></div>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-wrap gap-3 items-center">
                <Filter className="w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search name or handle..."
                    value={filter.search}
                    onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                    className="flex-1 min-w-40 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <select value={filter.platform} onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700">
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="medium">Medium</option>
                </select>
                <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700">
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="demo_sent">Demo Sent</option>
                    <option value="converted">Converted</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Poet</th>
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Contact</th>
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Score</th>
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredLeads.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                                    {loading ? 'Loading leads...' : 'No leads yet. Click "Start Scrape" to discover spiritual poets!'}
                                </td></tr>
                            )}
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                    onClick={() => setSelectedLead(lead)}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={e => { e.stopPropagation(); toggleFavorite(lead); }}
                                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                                                title={lead.isFavorite ? "Remove favorite" : "Mark as favorite"}>
                                                <Star className={cn("w-4 h-4 transition-colors", lead.isFavorite ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600")} />
                                            </button>
                                            {PLATFORM_ICON[lead.platform] || <Globe className="w-4 h-4 text-gray-400" />}
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                                                <a href={lead.profileUrl} target="_blank" rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="text-xs text-amber-500 hover:underline">
                                                    @{lead.handle}
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            {lead.phone && <span className="text-xs text-green-600 dark:text-green-400">📱 {lead.phone}</span>}
                                            {lead.email && <span className="text-xs text-blue-500 truncate max-w-36">✉️ {lead.email}</span>}
                                            {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="text-xs text-purple-500 hover:underline truncate max-w-36">🌐 website</a>}
                                            {!lead.phone && !lead.email && !lead.website && (
                                                <span className="text-xs text-gray-400">DM only</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={cn('h-2 rounded-full', lead.poetScore >= 70 ? 'bg-green-500' : lead.poetScore >= 40 ? 'bg-amber-500' : 'bg-red-400')}
                                                    style={{ width: `${lead.poetScore}%` }} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{lead.poetScore}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={lead.status}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => { e.stopPropagation(); updateStatus(lead, e.target.value); }}
                                            className={cn('text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer', STATUS_COLORS[lead.status])}>
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="demo_sent">Demo Sent</option>
                                            <option value="converted">Converted</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            <button title="Generate Music Sample"
                                                onClick={() => generateSample(lead)}
                                                disabled={actionLoading === `sample-${lead.id}`}
                                                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 disabled:opacity-50">
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                            <button title="Send WhatsApp"
                                                onClick={() => sendWhatsApp(lead)}
                                                disabled={!lead.phone || actionLoading === `wa-${lead.id}`}
                                                className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed">
                                                <MessageCircle className="w-3.5 h-3.5" />
                                            </button>
                                            <button title="Delete Lead"
                                                onClick={() => deleteLead(lead)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Scrape Modal */}
            {scrapeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">🔍 Start Scrape</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Source</label>
                                <div className="flex gap-2">
                                    {(['instagram', 'youtube'] as const).map(src => (
                                        <button key={src}
                                            onClick={() => setScrapeSource(src)}
                                            className={cn('flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-colors',
                                                scrapeSource === src
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700')}>
                                            {src === 'instagram' ? '📸 Instagram' : '▶️ YouTube'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Tag Generator */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/50">
                                <label className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> Agentic Search Setup
                                </label>
                                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mb-3">
                                    Describe the exact kind of high-quality leads you're looking for, and AI will find the best {scrapeSource === 'instagram' ? 'hashtags' : 'YouTube channels'} for you.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. Writers of sad urdu shayari..."
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && generateTags()}
                                        className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm border border-amber-200 dark:border-amber-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <Button 
                                        onClick={generateTags} 
                                        disabled={generatingTags || !aiPrompt.trim()}
                                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:hover:bg-amber-800/80 dark:text-amber-100 px-3 border-none">
                                        {generatingTags ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                    {scrapeSource === 'instagram' ? 'Hashtags (comma-separated)' : 'Channel IDs (comma-separated)'}
                                </label>
                                <textarea
                                    value={scrapeHashtags}
                                    onChange={e => setScrapeHashtags(e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                {scrapeSource === 'instagram' && (
                                    <p className="text-xs text-gray-400 mt-1">e.g., BhajanWriter, HindiPoetry, Shayari, MantraWriter</p>
                                )}
                                {scrapeSource === 'youtube' && (
                                    <p className="text-xs text-gray-400 mt-1">e.g., UCq-Fj5jknLsUf-MWSy4_brA (T-Series Bhakti)</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button variant="dotted" onClick={() => setScrapeModal(false)} className="flex-1">Cancel</Button>
                            <Button onClick={triggerScrape} disabled={scraping}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none">
                                {scraping ? 'Starting...' : '🚀 Start Scrape'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Detail Drawer */}
            {selectedLead && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
                    onClick={() => setSelectedLead(null)}>
                    <div className="w-full max-w-lg h-full bg-white dark:bg-gray-900 p-6 overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={e => { e.stopPropagation(); toggleFavorite(selectedLead); }}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Star className={cn("w-6 h-6", selectedLead.isFavorite ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600")} />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedLead.name}</h2>
                                    <a href={selectedLead.profileUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-amber-500 hover:underline">@{selectedLead.handle} · {selectedLead.platform}</a>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLead(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">✕</button>
                        </div>

                        <div className="space-y-4">
                            {/* Score */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Poet Score</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
                                        <div className="h-3 rounded-full bg-amber-500" style={{ width: `${selectedLead.poetScore}%` }} />
                                    </div>
                                    <span className="text-2xl font-bold text-amber-600">{selectedLead.poetScore}/100</span>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Contact Info</p>
                                {selectedLead.phone && <p className="text-sm">📱 <a href={`tel:${selectedLead.phone}`} className="text-green-600 hover:underline">{selectedLead.phone}</a></p>}
                                {selectedLead.whatsappUrl && <p className="text-sm">💬 <a href={selectedLead.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">WhatsApp Link</a></p>}
                                {selectedLead.email && <p className="text-sm">✉️ <a href={`mailto:${selectedLead.email}`} className="text-blue-500 hover:underline">{selectedLead.email}</a></p>}
                                {selectedLead.website && <p className="text-sm">🌐 <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline truncate">{selectedLead.website}</a></p>}
                                {!selectedLead.phone && !selectedLead.email && !selectedLead.website && (
                                    <p className="text-sm text-gray-400">No direct contact info found. Use DM.</p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">Best: <span className="font-medium capitalize">{selectedLead.bestContactMethod}</span> · {selectedLead.location || 'Location unknown'}</p>
                            </div>

                            {/* Sample Poem */}
                            {selectedLead.samplePoem && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">📜 Sample Poem</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-6">{selectedLead.samplePoem}</p>
                                </div>
                            )}

                            {/* Sample Audio */}
                            {selectedLead.sampleUrl && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                                    <p className="text-sm font-medium mb-2">🎵 Generated Sample</p>
                                    <audio controls src={selectedLead.sampleUrl} className="w-full" />
                                </div>
                            )}

                            {/* Tags */}
                            {selectedLead.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedLead.tags.map(tag => (
                                        <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button onClick={() => generateSample(selectedLead)}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none">
                                    <Play className="w-4 h-4 mr-2" /> Generate Sample
                                </Button>
                                <Button onClick={() => sendWhatsApp(selectedLead)}
                                    disabled={!selectedLead.phone}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none disabled:opacity-50">
                                    <Send className="w-4 h-4 mr-2" /> WhatsApp
                                </Button>
                                <Button onClick={() => deleteLead(selectedLead)}
                                    variant="outline"
                                    className="px-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/30">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
