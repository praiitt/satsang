import { getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    phone: string;
    email?: string;
    name?: string;
    profilePhoto?: string;

    // Lifecycle
    createdAt: Date;
    lastLoginAt: Date;
    onboardingCompleted: boolean;

    // Preferences
    language: 'en' | 'hi';
    notificationsEnabled: boolean;

    // Referral/Marketing
    referralCode: string;
    referredBy?: string;
    utmSource?: string;

    // Subscription Info (denormalized)
    hasActiveSubscription: boolean;
    currentPlan?: string;
    subscriptionEndDate?: Date;

    // Coins (denormalized)
    totalCoins: number;

    // Analytics
    totalSessions: number;
    totalSpent: number;
    lifetimeValue: number;
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(uid: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const uidHash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let code = '';

    for (let i = 0; i < 6; i++) {
        code += chars[(uidHash + i) % chars.length];
    }

    return code;
}

/**
 * User Service - Manages user profiles in Firestore
 */
export class UserService {
    /**
     * Get user profile by UID
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const db = getFirebaseFirestore();
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                return null;
            }

            const data = userSnap.data();
            return {
                ...data,
                createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
                lastLoginAt: data?.lastLoginAt?.toDate?.() || data?.lastLoginAt,
                subscriptionEndDate: data?.subscriptionEndDate?.toDate?.() || data?.subscriptionEndDate,
            } as UserProfile;
        } catch (error) {
            console.error('[UserService] Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Create new user profile
     */
    async createUserProfile(
        uid: string,
        phone: string,
        additionalData?: Partial<UserProfile>
    ): Promise<UserProfile> {
        try {
            const db = getFirebaseFirestore();
            const now = new Date();

            // Build profile object dynamically to exclude undefined values
            const userProfile: any = {
                uid,
                phone,
                createdAt: now,
                lastLoginAt: now,
                onboardingCompleted: false,
                language: additionalData?.language || 'en',
                notificationsEnabled: true,
                referralCode: generateReferralCode(uid),
                hasActiveSubscription: false,
                totalCoins: 0,
                totalSessions: 0,
                totalSpent: 0,
                lifetimeValue: 0,
            };

            // Only add optional fields if they exist
            if (additionalData?.email) userProfile.email = additionalData.email;
            if (additionalData?.name) userProfile.name = additionalData.name;
            if (additionalData?.profilePhoto) userProfile.profilePhoto = additionalData.profilePhoto;
            if (additionalData?.referredBy) userProfile.referredBy = additionalData.referredBy;
            if (additionalData?.utmSource) userProfile.utmSource = additionalData.utmSource;
            if (additionalData?.currentPlan) userProfile.currentPlan = additionalData.currentPlan;
            if (additionalData?.subscriptionEndDate) userProfile.subscriptionEndDate = additionalData.subscriptionEndDate;

            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, userProfile);

            console.log('[UserService] Created user profile:', uid);
            return userProfile as UserProfile;
        } catch (error) {
            console.error('[UserService] Error creating user profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(
        uid: string,
        updates: Partial<UserProfile>
    ): Promise<void> {
        try {
            const db = getFirebaseFirestore();
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                ...updates,
                lastLoginAt: new Date(),
            } as any);

            console.log('[UserService] Updated user profile:', uid);
        } catch (error) {
            console.error('[UserService] Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Complete onboarding
     */
    async completeOnboarding(
        uid: string,
        email: string,
        name: string,
        language: 'en' | 'hi'
    ): Promise<void> {
        try {
            await this.updateUserProfile(uid, {
                email,
                name,
                language,
                onboardingCompleted: true,
            });

            console.log('[UserService] Onboarding completed:', uid);
        } catch (error) {
            console.error('[UserService] Error completing onboarding:', error);
            throw error;
        }
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(uid: string): Promise<void> {
        try {
            const db = getFirebaseFirestore();
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                lastLoginAt: new Date(),
            });
        } catch (error) {
            console.error('[UserService] Error updating last login:', error);
        }
    }

    /**
     * Increment session count
     */
    async incrementSessionCount(uid: string): Promise<void> {
        try {
            const db = getFirebaseFirestore();
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    totalSessions: (userSnap.data()?.totalSessions || 0) + 1,
                });
            }
        } catch (error) {
            console.error('[UserService] Error incrementing session:', error);
        }
    }

    /**
     * Update subscription status
     */
    async updateSubscription(
        uid: string,
        plan: string,
        endDate: Date
    ): Promise<void> {
        try {
            await this.updateUserProfile(uid, {
                hasActiveSubscription: true,
                currentPlan: plan,
                subscriptionEndDate: endDate,
            });
        } catch (error) {
            console.error('[UserService] Error updating subscription:', error);
            throw error;
        }
    }

    /**
     * Update coin balance (denormalized)
     */
    async updateCoinBalance(uid: string, totalCoins: number): Promise<void> {
        try {
            const db = getFirebaseFirestore();
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                totalCoins,
            });
        } catch (error) {
            console.error('[UserService] Error updating coins:', error);
        }
    }
}

export const userService = new UserService();
export default userService;
