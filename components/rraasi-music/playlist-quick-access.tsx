'use client';

import { List, Music2 } from 'lucide-react';
import { usePlaylists } from '@/hooks/use-playlists';
import { useEffect } from 'react';

interface PlaylistQuickAccessProps {
    onSelectPlaylist: (playlistId: string) => void;
    className?: string;
}

export function PlaylistQuickAccess({ onSelectPlaylist, className = '' }: PlaylistQuickAccessProps) {
    const { playlists, fetchPlaylists, loading } = usePlaylists();

    useEffect(() => {
        fetchPlaylists();
    }, [fetchPlaylists]);

    if (loading) {
        return (
            <div className={`rounded-2xl bg-white/5 backdrop-blur-md p-4 ${className}`}>
                <div className="flex items-center gap-2 mb-3">
                    <List className="h-5 w-5 text-amber-400" />
                    <h3 className="font-serif text-lg font-bold text-white">My Playlists</h3>
                </div>
                <div className="animate-pulse space-y-2">
                    <div className="h-10 bg-white/10 rounded-lg" />
                    <div className="h-10 bg-white/10 rounded-lg" />
                </div>
            </div>
        );
    }

    if (playlists.length === 0) {
        return (
            <div className={`rounded-2xl bg-white/5 backdrop-blur-md p-4 ${className}`}>
                <div className="flex items-center gap-2 mb-3">
                    <List className="h-5 w-5 text-amber-400" />
                    <h3 className="font-serif text-lg font-bold text-white">My Playlists</h3>
                </div>
                <p className="text-sm text-white/60">No playlists yet. Add tracks to create your first playlist!</p>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl bg-white/5 backdrop-blur-md p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <List className="h-5 w-5 text-amber-400" />
                    <h3 className="font-serif text-lg font-bold text-white">My Playlists</h3>
                </div>
                <span className="text-xs text-white/40">{playlists.length}</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {playlists.slice(0, 5).map((playlist) => (
                    <button
                        key={playlist.id}
                        onClick={() => onSelectPlaylist(playlist.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group text-left"
                    >
                        <div className="flex  h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                            <Music2 className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate text-sm group-hover:text-amber-400 transition-colors">
                                {playlist.name}
                            </p>
                            <p className="text-xs text-white/40">{playlist.trackCount} tracks</p>
                        </div>
                    </button>
                ))}
                {playlists.length > 5 && (
                    <p className="text-xs text-center text-white/40 pt-2">
                        +{playlists.length - 5} more playlists
                    </p>
                )}
            </div>
        </div>
    );
}
