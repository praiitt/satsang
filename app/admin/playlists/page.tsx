'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Plus, Trash2, Edit, Save, X, Image as ImageIcon, Search, Check, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface CuratedPlaylist {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    tracks: string[];
    isPublic: boolean;
}

const PRESET_CATEGORIES = ['Shiva', 'Krishna', 'Durga / Devi', 'Ram', 'Hanuman', 'Ganesha', 'Spiritual Trance', 'Meditation / Calm', 'Other…'];

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const isCustom = !PRESET_CATEGORIES.slice(0, -1).includes(value);
    const [showCustom, setShowCustom] = useState(isCustom);

    return (
        <div className="space-y-2">
            <select
                value={showCustom ? 'Other…' : value}
                onChange={e => {
                    if (e.target.value === 'Other…') { setShowCustom(true); onChange(''); }
                    else { setShowCustom(false); onChange(e.target.value); }
                }}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-amber-500 transition-colors"
            >
                {PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {showCustom && (
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Enter custom category…"
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-amber-500 transition-colors"
                />
            )}
        </div>
    );
}

export default function AdminPlaylistsDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '', imageUrl: '', category: 'Shiva' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [managingPlaylist, setManagingPlaylist] = useState<CuratedPlaylist | null>(null);
    const [editingPlaylist, setEditingPlaylist] = useState<CuratedPlaylist | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', imageUrl: '', category: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/');
        if (user) fetchPlaylists();
    }, [user, authLoading]);

    async function fetchPlaylists() {
        setLoading(true);
        try {
            const res = await fetch('/api/next-admin/music/playlists');
            const data = await res.json();
            setPlaylists(data.playlists || []);
        } catch (e) {
            toast.error('Failed to fetch playlists');
        } finally {
            setLoading(false);
        }
    }

    async function createPlaylist() {
        if (!newPlaylist.name) return toast.error('Name is required');
        setActionLoading('create');
        try {
            const res = await fetch('/api/next-admin/music/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPlaylist)
            });
            if (!res.ok) throw new Error('Failed to create');
            const data = await res.json();
            setPlaylists([data.playlist, ...playlists]);
            setIsCreating(false);
            setNewPlaylist({ name: '', description: '', imageUrl: '', category: 'Shiva' });
            toast.success('Playlist created!');
        } catch {
            toast.error('Failed to create playlist');
        } finally {
            setActionLoading(null);
        }
    }

    async function saveEdit() {
        if (!editingPlaylist) return;
        if (!editForm.name) return toast.error('Name is required');
        setActionLoading('edit');
        try {
            const res = await fetch(`/api/next-admin/music/playlists/${editingPlaylist.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error();
            const updated = { ...editingPlaylist, ...editForm };
            setPlaylists(playlists.map(p => p.id === editingPlaylist.id ? updated : p));
            setEditingPlaylist(null);
            toast.success('Playlist updated!');
        } catch {
            toast.error('Failed to update playlist');
        } finally {
            setActionLoading(null);
        }
    }

    async function deletePlaylist(id: string) {
        if (!confirm('Delete this playlist?')) return;
        setActionLoading(`delete-${id}`);
        try {
            const res = await fetch(`/api/next-admin/music/playlists/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setPlaylists(playlists.filter(p => p.id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Failed to delete');
        } finally {
            setActionLoading(null);
        }
    }

    async function generateImage(forEdit = false) {
        const src = forEdit ? editForm : newPlaylist;
        if (!src.name) return toast.error('Enter a name first');
        setIsGeneratingImage(true);
        try {
            const res = await fetch('/api/next-admin/music/playlists/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `Lord ${src.category} or ${src.name}, ${src.description}` })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            const data = await res.json();
            if (forEdit) setEditForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
            else setNewPlaylist(prev => ({ ...prev, imageUrl: data.imageUrl }));
            toast.success('Image generated!');
        } catch (e: any) {
            toast.error(e.message || 'Failed to generate image');
        } finally {
            setIsGeneratingImage(false);
        }
    }

    async function searchTracks() {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/rraasi-music/community-tracks?search=${encodeURIComponent(searchQuery)}&limit=10`);
            const data = await res.json();
            setSearchResults((data.tracks || []).map((t: any) => ({
                id: t.id,
                title: t.title || t.trackName || 'Untitled',
                imageUrl: t.imageUrl || t.image_url || t.thumbnailUrl,
                userId: t.userId,
                userEmail: t.userEmail || t.userId
            })));
        } catch {
            toast.error('Failed to search');
        } finally {
            setIsSearching(false);
        }
    }

    async function toggleTrack(trackId: string) {
        if (!managingPlaylist) return;
        const has = managingPlaylist.tracks.includes(trackId);
        const newTracks = has ? managingPlaylist.tracks.filter(id => id !== trackId) : [...managingPlaylist.tracks, trackId];
        setActionLoading(`t-${trackId}`);
        try {
            const res = await fetch(`/api/next-admin/music/playlists/${managingPlaylist.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracks: newTracks })
            });
            if (!res.ok) throw new Error();
            const updated = { ...managingPlaylist, tracks: newTracks };
            setManagingPlaylist(updated);
            setPlaylists(playlists.map(p => p.id === managingPlaylist.id ? updated : p));
            toast.success(has ? 'Track removed' : 'Track added');
        } catch {
            toast.error('Failed to update tracks');
        } finally {
            setActionLoading(null);
        }
    }

    const PlaylistForm = ({ data, setData, onSave, onCancel, saveLabel, saving, title }: any) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{title}</h2>
                <button onClick={onCancel} className="p-2 text-gray-400 hover:text-red-500 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input type="text" value={data.name} onChange={e => setData((p: any) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Shiva Bhajans"
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-amber-500 transition-colors" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category / Deity</label>
                    <CategorySelect value={data.category} onChange={v => setData((p: any) => ({ ...p, category: v }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea value={data.description} onChange={e => setData((p: any) => ({ ...p, description: e.target.value }))}
                        placeholder="A beautiful collection of mantras..."
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-amber-500 transition-colors h-24 resize-none" />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" value={data.imageUrl} onChange={e => setData((p: any) => ({ ...p, imageUrl: e.target.value }))}
                                placeholder="https://..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-amber-500 transition-colors" />
                        </div>
                        <button onClick={() => generateImage(!!editingPlaylist)} disabled={isGeneratingImage || !data.name}
                            className="px-4 flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg border border-indigo-500/20 disabled:opacity-50 transition-colors">
                            {isGeneratingImage ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Wand2 className="w-5 h-5" />}
                            <span className="hidden sm:inline">Generate AI Art</span>
                        </button>
                        <button onClick={onSave} disabled={saving || !data.name}
                            className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors whitespace-nowrap">
                            {saving ? 'Saving...' : saveLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading playlists...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 pt-24">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-cinzel text-gray-900 dark:text-white">Curated Playlists</h1>
                        <p className="text-gray-500">Manage permanent playlists (Deity, Trance, Meditation) shown to all users.</p>
                    </div>
                    <button onClick={() => { setIsCreating(true); setEditingPlaylist(null); }}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-lg">
                        <Plus className="w-5 h-5" /> Create Curated Playlist
                    </button>
                </div>

                {isCreating && (
                    <PlaylistForm
                        data={newPlaylist} setData={setNewPlaylist}
                        onSave={createPlaylist} onCancel={() => setIsCreating(false)}
                        saveLabel="Save Playlist" saving={actionLoading === 'create'} title="New Playlist"
                    />
                )}

                {editingPlaylist && (
                    <PlaylistForm
                        data={editForm} setData={setEditForm}
                        onSave={saveEdit} onCancel={() => setEditingPlaylist(null)}
                        saveLabel="Save Changes" saving={actionLoading === 'edit'} title={`Edit: ${editingPlaylist.name}`}
                    />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {playlists.map(playlist => (
                        <div key={playlist.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all">
                            <div className="h-40 bg-gray-200 dark:bg-gray-900 relative">
                                {playlist.imageUrl ? (
                                    <img src={playlist.imageUrl} alt={playlist.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 to-orange-600">
                                        <Music className="w-12 h-12 text-white/50 mb-2" />
                                        <span className="text-white/80 font-bold uppercase tracking-widest text-xs">{playlist.category}</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                        onClick={() => { setEditingPlaylist(playlist); setEditForm({ name: playlist.name, description: playlist.description, imageUrl: playlist.imageUrl, category: playlist.category }); setIsCreating(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="p-2 bg-blue-500/80 hover:bg-blue-500 text-white rounded-full backdrop-blur-sm transition-colors shadow-sm"
                                        title="Edit Playlist">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deletePlaylist(playlist.id)} disabled={actionLoading === `delete-${playlist.id}`}
                                        className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors shadow-sm"
                                        title="Delete Playlist">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-2 right-2">
                                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-md uppercase tracking-wider">{playlist.category}</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{playlist.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 h-10">{playlist.description || 'No description.'}</p>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-xs font-medium text-gray-500">{playlist.tracks?.length || 0} tracks</span>
                                    <button onClick={() => setManagingPlaylist(playlist)}
                                        className="text-amber-500 hover:text-amber-600 text-sm font-bold transition-colors">
                                        Manage Tracks →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {playlists.length === 0 && !isCreating && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center">
                            <Music className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Curated Playlists</h3>
                            <p className="text-gray-500 mb-6">Create predefined playlists grouped by Gods and Goddesses for your users.</p>
                            <button onClick={() => setIsCreating(true)}
                                className="px-6 py-2 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors shadow-lg">
                                Create First Playlist
                            </button>
                        </div>
                    )}
                </div>

                {/* Manage Tracks Modal */}
                {managingPlaylist && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Tracks</h2>
                                    <p className="text-sm text-gray-500">Adding to <span className="font-semibold text-amber-500">{managingPlaylist.name}</span> ({managingPlaylist.tracks.length} tracks)</p>
                                </div>
                                <button onClick={() => { setManagingPlaylist(null); setSearchResults([]); setSearchQuery(''); }}
                                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && searchTracks()}
                                            placeholder="Search by title or email..."
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-amber-500 outline-none transition-colors" />
                                    </div>
                                    <button onClick={searchTracks} disabled={isSearching || !searchQuery.trim()}
                                        className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors">
                                        {isSearching ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {searchResults.length === 0 && !isSearching && (
                                    <div className="text-center py-12 text-gray-500">Search for tracks to add them to this playlist.</div>
                                )}
                                {searchResults.map(track => {
                                    const inPlaylist = managingPlaylist.tracks.includes(track.id);
                                    return (
                                        <div key={track.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
                                                    {track.imageUrl ? <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" /> : <Music className="w-full h-full p-2 text-gray-400" />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{track.title}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{track.userEmail}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => toggleTrack(track.id)} disabled={actionLoading === `t-${track.id}`}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${inPlaylist
                                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50'
                                                    : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'}`}>
                                                {actionLoading === `t-${track.id}` ? '...' : (inPlaylist ? 'Remove' : 'Add')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
