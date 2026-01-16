'use client';

import { useEffect, useState } from 'react';
import { usePlaylists } from '@/hooks/use-playlists';
import { Button } from '@/components/livekit/button';
import { Plus, Music, Play, Trash2, X } from 'lucide-react';
import { CreatePlaylistModal } from './create-playlist-modal';

interface PlaylistListProps {
    onPlayPlaylist: (playlistId: string) => void;
}

interface PlaylistTrack {
    id: string;
    title: string;
    imageUrl?: string;
    audioUrl: string;
}

export function PlaylistList({ onPlayPlaylist }: PlaylistListProps) {
    const { playlists, fetchPlaylists, loading } = usePlaylists();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
    const [playlistTracks, setPlaylistTracks] = useState<Record<string, PlaylistTrack[]>>({});
    const [loadingTracks, setLoadingTracks] = useState<string | null>(null);
    const [removingTrack, setRemovingTrack] = useState<string | null>(null);

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const loadPlaylistTracks = async (playlistId: string) => {
        if (playlistTracks[playlistId]) {
            setExpandedPlaylist(expandedPlaylist === playlistId ? null : playlistId);
            return;
        }

        setLoadingTracks(playlistId);
        try {
            const res = await fetch(`/api/playlists/${playlistId}`);
            if (res.ok) {
                const data = await res.json();
                setPlaylistTracks(prev => ({ ...prev, [playlistId]: data.tracks || [] }));
                setExpandedPlaylist(playlistId);
            }
        } catch (e) {
            console.error('Failed to load tracks', e);
        } finally {
            setLoadingTracks(null);
        }
    };

    const removeTrack = async (playlistId: string, trackId: string) => {
        setRemovingTrack(trackId);
        try {
            const res = await fetch(`/api/playlists/${playlistId}/tracks?trackId=${trackId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                // Refresh tracks
                const tracksRes = await fetch(`/api/playlists/${playlistId}`);
                if (tracksRes.ok) {
                    const data = await tracksRes.json();
                    setPlaylistTracks(prev => ({ ...prev, [playlistId]: data.tracks || [] }));
                }
                // Refresh playlist list to update count
                await fetchPlaylists();
            }
        } catch (e) {
            console.error('Failed to remove track', e);
        } finally {
            setRemovingTrack(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Actions */}
            <div className="flex justify-end">
                <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="outline"
                    className="border-gold-500/30 text-gold-400 hover:bg-gold-500/10"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : playlists.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
                    <Music className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500 text-lg mb-6">You haven't created any playlists yet.</p>
                    <Button onClick={() => setShowCreateModal(true)} variant="primary">
                        Create Your First
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {playlists.map((playlist) => (
                        <div
                            key={playlist.id}
                            className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden hover:border-gold-500/30 transition-all"
                        >
                            {/* Playlist Header */}
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center shrink-0">
                                        <Music className="w-8 h-8 text-zinc-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-serif text-xl truncate">{playlist.name}</h3>
                                        <p className="text-zinc-400 text-sm">{playlist.trackCount} Tracks</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/10 text-white hover:bg-white/10"
                                        onClick={() => loadPlaylistTracks(playlist.id)}
                                        disabled={loadingTracks === playlist.id}
                                    >
                                        {loadingTracks === playlist.id ? (
                                            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                        ) : expandedPlaylist === playlist.id ? (
                                            <X className="w-4 h-4" />
                                        ) : (
                                            'View Tracks'
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-gold-500 hover:bg-gold-600 text-black font-medium"
                                        onClick={() => onPlayPlaylist(playlist.id)}
                                    >
                                        <Play className="w-4 h-4 mr-1" /> Play
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Track List */}
                            {expandedPlaylist === playlist.id && playlistTracks[playlist.id] && (
                                <div className="border-t border-white/5 bg-black/20">
                                    {playlistTracks[playlist.id].length === 0 ? (
                                        <div className="p-6 text-center text-zinc-500">
                                            This playlist is empty. Add some tracks!
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {playlistTracks[playlist.id].map((track, index) => (
                                                <div
                                                    key={track.id}
                                                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group"
                                                >
                                                    <span className="text-zinc-600 w-6 text-sm">{index + 1}</span>
                                                    {track.imageUrl ? (
                                                        <img
                                                            src={track.imageUrl}
                                                            alt={track.title}
                                                            className="w-12 h-12 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                                                            <Music className="w-6 h-6 text-zinc-700" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate">{track.title}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeTrack(playlist.id, track.id)}
                                                        disabled={removingTrack === track.id}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                                        title="Remove from playlist"
                                                    >
                                                        {removingTrack === track.id ? (
                                                            <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin inline-block" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <CreatePlaylistModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={fetchPlaylists}
                />
            )}
        </div>
    );
}
