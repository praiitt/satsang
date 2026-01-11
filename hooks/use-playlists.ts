import { useState, useCallback } from 'react';
import { Playlist } from '@/types/playlist';
import { useAuth } from '@/components/auth/auth-provider';

export function usePlaylists() {
    const { user } = useAuth();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPlaylists = useCallback(async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/playlists/${user.uid}`);
            if (res.ok) {
                const data = await res.json();
                setPlaylists(data.playlists || []);
            }
        } catch (e) {
            console.error("Failed to fetch playlists", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const createPlaylist = async (name: string, description?: string) => {
        if (!user?.uid) return;
        try {
            const res = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, name, description })
            });
            if (res.ok) {
                await fetchPlaylists();
                return true;
            }
        } catch (e) {
            console.error("Failed to create playlist", e);
        }
        return false;
    };

    const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
        try {
            const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackId })
            });
            return res.ok;
        } catch (e) {
            console.error("Failed to add track", e);
            return false;
        }
    };

    return {
        playlists,
        loading,
        fetchPlaylists,
        createPlaylist,
        addTrackToPlaylist
    };
}
