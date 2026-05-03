'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

export function useFavorites() {
    const { user, isAuthenticated } = useAuth();
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    // Load just the IDs on mount (lightweight)
    const fetchFavoriteIds = useCallback(async () => {
        if (!isAuthenticated) {
            setFavoriteIds(new Set());
            return;
        }
        try {
            const res = await fetch('/api/favorites?idsOnly=true');
            if (res.ok) {
                const data = await res.json();
                setFavoriteIds(new Set(data.ids || []));
            }
        } catch (e) {
            console.error('[useFavorites] Failed to fetch IDs', e);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchFavoriteIds();
    }, [fetchFavoriteIds]);

    const isFavorite = useCallback((trackId: string) => favoriteIds.has(trackId), [favoriteIds]);

    const toggleFavorite = useCallback(async (trackId: string) => {
        if (!isAuthenticated) return;

        const wasFavorite = favoriteIds.has(trackId);

        // Optimistic update
        setFavoriteIds(prev => {
            const next = new Set(prev);
            if (wasFavorite) next.delete(trackId);
            else next.add(trackId);
            return next;
        });

        try {
            if (wasFavorite) {
                await fetch(`/api/favorites/${trackId}`, { method: 'DELETE' });
            } else {
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trackId })
                });
            }
        } catch (e) {
            console.error('[useFavorites] Toggle failed, reverting', e);
            // Revert
            setFavoriteIds(prev => {
                const next = new Set(prev);
                if (wasFavorite) next.add(trackId);
                else next.delete(trackId);
                return next;
            });
        }
    }, [isAuthenticated, favoriteIds]);

    const fetchFavoriteTracks = useCallback(async () => {
        if (!isAuthenticated) return { tracks: [] };
        setLoading(true);
        try {
            const res = await fetch('/api/favorites');
            if (res.ok) return await res.json();
        } catch (e) {
            console.error('[useFavorites] Failed to fetch tracks', e);
        } finally {
            setLoading(false);
        }
        return { tracks: [] };
    }, [isAuthenticated]);

    return { favoriteIds, isFavorite, toggleFavorite, fetchFavoriteTracks, loading, refetch: fetchFavoriteIds };
}
