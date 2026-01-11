'use client';

import { useEffect } from 'react';
import { usePlaylists } from '@/hooks/use-playlists';
import { Button } from '@/components/livekit/button';
import { Plus, Music, Play } from 'lucide-react';
import { CreatePlaylistModal } from './create-playlist-modal';
import { useState } from 'react';

interface PlaylistListProps {
    onPlayPlaylist: (playlistId: string) => void;
}

export function PlaylistList({ onPlayPlaylist }: PlaylistListProps) {
    const { playlists, fetchPlaylists, loading } = usePlaylists();
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchPlaylists();
    }, []);

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {playlists.map((playlist) => (
                        <div
                            key={playlist.id}
                            className="group relative aspect-square bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden hover:border-gold-500/30 transition-all hover:scale-[1.02]"
                        >
                            {/* Cover Image Placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                                <Music className="w-12 h-12 text-zinc-700 group-hover:text-gold-500/20 transition-colors" />
                            </div>

                            {/* Overlay Info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6">
                                <h3 className="text-white font-serif text-xl truncate mb-1">{playlist.name}</h3>
                                <p className="text-zinc-400 text-sm mb-4">{playlist.trackCount} Tracks</p>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                                    <Button
                                        size="sm"
                                        className="w-full bg-gold-500 hover:bg-gold-600 text-black font-medium"
                                        onClick={() => onPlayPlaylist(playlist.id)}
                                    >
                                        <Play className="w-4 h-4 mr-1" /> Play
                                    </Button>
                                </div>
                            </div>
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
