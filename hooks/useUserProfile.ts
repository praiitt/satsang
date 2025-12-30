import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { userService, UserProfile } from '@/lib/services/userService';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook to manage user profile state
 */
export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        const auth = getFirebaseAuth();

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setProfile(null);
                setLoading(false);
                setNeedsOnboarding(false);
                return;
            }

            try {
                // Get or create user profile
                let userProfile = await userService.getUserProfile(user.uid);

                if (!userProfile) {
                    // Create new user profile with phone from Firebase
                    const phone = user.phoneNumber || '';
                    userProfile = await userService.createUserProfile(user.uid, phone);
                    setNeedsOnboarding(true);
                } else if (!userProfile.onboardingCompleted) {
                    setNeedsOnboarding(true);
                }

                // Update last login
                await userService.updateLastLogin(user.uid);

                setProfile(userProfile);
                setLoading(false);
            } catch (error) {
                console.error('[useUserProfile] Error:', error);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const refreshProfile = async () => {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;

        if (!user) return;

        const userProfile = await userService.getUserProfile(user.uid);
        setProfile(userProfile);

        if (userProfile && userProfile.onboardingCompleted) {
            setNeedsOnboarding(false);
        }
    };

    return {
        profile,
        loading,
        needsOnboarding,
        refreshProfile,
    };
}
