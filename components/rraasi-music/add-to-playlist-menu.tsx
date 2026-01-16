'use client';

import { useState, useEffect } from 'react';
import { MoreVertical, Plus, Music } from 'lucide-react';
import { usePlaylists } from '@/hooks/use-playlists';
import { CreatePlaylistModal } from './create-playlist-modal';
import { Button } from '@/components/livekit/button';

interface AddToPlaylistMenuProps {
    trackId: string;
}

export function AddToPlaylistMenu({ trackId }: AddToPlaylistMenuProps) {
    const { playlists, fetchPlaylists, addTrackToPlaylist } = usePlaylists();
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [addingTo, setAddingTo] = useState<string | null>(null);

    // Close menu when clicking outside (simple implementation)
    useEffect(() => {
        const handleClick = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        fetchPlaylists(); // Refresh list on open
        setIsOpen(!isOpen);
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        setAddingTo(playlistId);
        await addTrackToPlaylist(playlistId, trackId);
        await fetchPlaylists(); // Refresh to show updated count
        setAddingTo(null);
        setIsOpen(false);
        // Could show a toast here
    };

    return (
        <div className="relative">
            <button
                onClick={toggleMenu}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white transition-all hover:scale-110"
                title="Add to Playlist"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 bottom-full mb-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2 border-b border-white/5">
                        <span className="text-xs font-medium text-zinc-500 px-2">Add to Playlist</span>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                        {playlists.length === 0 ? (
                            <div className="p-3 text-sm text-zinc-500 text-center">No playlists yet</div>
                        ) : (
                            playlists.map(playlist => (
                                <button
                                    key={playlist.id}
                                    onClick={() => handleAddToPlaylist(playlist.id)}
                                    disabled={addingTo === playlist.id}
                                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between"
                                >
                                    <span className="truncate">{playlist.name}</span>
                                    {addingTo === playlist.id && <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-white/5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowCreateModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Playlist
                        </button>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <CreatePlaylistModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        fetchPlaylists(); // Refresh list after creation
                        // Ideally, we'd add to the new playlist immediately, but user can click again for now
                    }}
                />
            )}
        </div>
    );
}
