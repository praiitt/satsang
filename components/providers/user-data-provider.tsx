'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth } from '@/lib/firebase-client';

interface UserData {
    followingGurus: string[];
    favoriteGurus: string[];
}

interface UserDataContextType extends UserData {
    loading: boolean;
    isFollowing: (guruId: string) => boolean;
    isFavorite: (guruId: string) => boolean;
    toggleFollow: (guruId: string) => Promise<void>;
    toggleFavorite: (guruId: string) => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// Use relative URL to leverage Next.js Rewrites (which handle dev vs prod proxying)
const API_BASE = '/api';

export function UserDataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [data, setData] = useState<UserData>({ followingGurus: [], favoriteGurus: [] });
    const [loading, setLoading] = useState(false);

    // Helper to get token
    const getToken = async () => {
        const auth = getFirebaseAuth();
        if (!auth.currentUser) return null;
        return await auth.currentUser.getIdToken();
    };

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setData({ followingGurus: [], favoriteGurus: [] });
            return;
        }

        try {
            const token = await getToken();
            if (!token) return;

            const res = await fetch(`${API_BASE}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const json = await res.json();
                setData({
                    followingGurus: json.following_gurus || [],
                    favoriteGurus: json.favorite_gurus || [],
                });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Actions
    const toggleFollow = async (guruId: string) => {
        const isFollowing = data.followingGurus.includes(guruId);

        // Optimistic Update
        setData(prev => ({
            ...prev,
            followingGurus: isFollowing
                ? prev.followingGurus.filter(id => id !== guruId)
                : [...prev.followingGurus, guruId]
        }));

        try {
            const token = await getToken();
            const method = isFollowing ? 'DELETE' : 'POST';
            await fetch(`${API_BASE}/user/gurus/${guruId}/follow`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error toggling follow:', error);
            // Revert on error
            fetchProfile();
        }
    };

    const toggleFavorite = async (guruId: string) => {
        const isFav = data.favoriteGurus.includes(guruId);

        // Optimistic Update
        setData(prev => ({
            ...prev,
            favoriteGurus: isFav
                ? prev.favoriteGurus.filter(id => id !== guruId)
                : [...prev.favoriteGurus, guruId]
        }));

        try {
            const token = await getToken();
            const method = isFav ? 'DELETE' : 'POST';
            await fetch(`${API_BASE}/user/gurus/${guruId}/favorite`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Revert on error
            fetchProfile();
        }
    };

    const isFollowing = (guruId: string) => data.followingGurus.includes(guruId);
    const isFavorite = (guruId: string) => data.favoriteGurus.includes(guruId);

    return (
        <UserDataContext.Provider value={{
            ...data,
            loading,
            isFollowing,
            isFavorite,
            toggleFollow,
            toggleFavorite,
            refreshUserData: fetchProfile
        }}>
            {children}
        </UserDataContext.Provider>
    );
}

export function useUserData() {
    const context = useContext(UserDataContext);
    if (context === undefined) {
        throw new Error('useUserData must be used within a UserDataProvider');
    }
    return context;
}
