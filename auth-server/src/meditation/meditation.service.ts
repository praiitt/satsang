import { getDb } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Meditation Service - Handles meditation sessions, playlists, and tracking
 */

export interface MeditationSession {
    id?: string;
    userId: string;
    intention: string;
    mood_before: 'peaceful' | 'stressed' | 'joyful' | 'tired' | 'neutral';
    mood_after?: 'peaceful' | 'stressed' | 'joyful' | 'tired' | 'neutral';
    musicUsed: string[]; // Track IDs
    generatedMusic: boolean;
    duration: number; // seconds
    completedAt: FirebaseFirestore.Timestamp;
    agentGuided: boolean;
    notes?: string;
}

export interface MeditationPlaylist {
    id?: string;
    name: string;
    description: string;
    sessionType: 'morning' | 'evening' | 'celebration' | 'deep';
    trackIds: string[];
    duration: number; // minutes
    bpmRange: {
        min: number;
        max: number;
    };
    createdBy: string; // 'official' or userId
    isOfficial: boolean;
    isPublic: boolean;
    createdAt: FirebaseFirestore.Timestamp;
}

export interface SessionStats {
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    lastSessionDate?: Date;
    moodTrends: {
        before: Record<string, number>;
        after: Record<string, number>;
    };
}

export class MeditationService {
    private db: Firestore;

    constructor() {
        this.db = getDb();
    }

    /**
     * Get user's meditation sessions
     */
    async getUserSessions(userId: string, limit: number = 10): Promise<MeditationSession[]> {
        // Remove orderBy to avoid composite index requirement
        const snapshot = await this.db
            .collection('meditation_sessions')
            .where('userId', '==', userId)
            .limit(limit * 2) // Get more to ensure we have enough after sorting
            .get();

        const sessions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MeditationSession));

        // Sort in memory by completedAt
        sessions.sort((a, b) => {
            const aTime = a.completedAt?.toMillis?.() || 0;
            const bTime = b.completedAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        return sessions.slice(0, limit);
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string): Promise<MeditationSession | null> {
        const doc = await this.db.collection('meditation_sessions').doc(sessionId).get();

        if (!doc.exists) {
            return null;
        }

        return {
            id: doc.id,
            ...doc.data()
        } as MeditationSession;
    }

    /**
     * Save completed meditation session
     */
    async saveSession(session: Omit<MeditationSession, 'id'>): Promise<string> {
        const docRef = await this.db.collection('meditation_sessions').add({
            ...session,
            completedAt: FieldValue.serverTimestamp()
        });

        return docRef.id;
    }

    /**
     * Update session with post-meditation mood
     */
    async updateSessionMood(sessionId: string, mood_after: string, notes?: string): Promise<void> {
        await this.db.collection('meditation_sessions').doc(sessionId).update({
            mood_after,
            ...(notes && { notes })
        });
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId: string): Promise<SessionStats> {
        const sessions = await this.getUserSessions(userId, 100); // Get more for stats

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalMinutes: 0,
                currentStreak: 0,
                longestStreak: 0,
                moodTrends: {
                    before: {},
                    after: {}
                }
            };
        }

        // Calculate total minutes
        const totalMinutes = Math.floor(
            sessions.reduce((sum, s) => sum + s.duration, 0) / 60
        );

        // Calculate streaks
        const { currentStreak, longestStreak } = this.calculateStreaks(sessions);

        // Calculate mood trends
        const moodTrends = this.calculateMoodTrends(sessions);

        return {
            totalSessions: sessions.length,
            totalMinutes,
            currentStreak,
            longestStreak,
            lastSessionDate: sessions[0]?.completedAt?.toDate(),
            moodTrends
        };
    }

    /**
     * Calculate meditation streaks
     */
    private calculateStreaks(sessions: MeditationSession[]): { currentStreak: number; longestStreak: number } {
        if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

        const dates = sessions.map(s => {
            const date = s.completedAt?.toDate();
            if (!date) return null;
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        }).filter(d => d !== null) as number[];

        const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Check current streak
        if (uniqueDates[0] === todayTime || uniqueDates[0] === todayTime - oneDayMs) {
            currentStreak = 1;

            for (let i = 1; i < uniqueDates.length; i++) {
                const diff = uniqueDates[i - 1] - uniqueDates[i];
                if (diff === oneDayMs) {
                    currentStreak++;
                    tempStreak++;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        tempStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const diff = uniqueDates[i - 1] - uniqueDates[i];
            if (diff === oneDayMs) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, currentStreak);

        return { currentStreak, longestStreak };
    }

    /**
     * Calculate mood trends
     */
    private calculateMoodTrends(sessions: MeditationSession[]) {
        const before: Record<string, number> = {};
        const after: Record<string, number> = {};

        sessions.forEach(session => {
            // Count before moods
            if (session.mood_before) {
                before[session.mood_before] = (before[session.mood_before] || 0) + 1;
            }

            // Count after moods
            if (session.mood_after) {
                after[session.mood_after] = (after[session.mood_after] || 0) + 1;
            }
        });

        return { before, after };
    }

    /**
     * Get meditation playlists
     */
    async getPlaylists(userId?: string, sessionType?: string): Promise<MeditationPlaylist[]> {
        let query = this.db.collection('meditation_playlists').where('isPublic', '==', true);

        if (sessionType) {
            query = query.where('sessionType', '==', sessionType) as any;
        }

        // Remove orderBy to avoid composite index requirement
        const snapshot = await query.limit(20).get();

        const playlists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MeditationPlaylist));

        // Sort in memory by createdAt
        playlists.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        // If user provided, also get their private playlists
        if (userId) {
            const userPlaylistsSnapshot = await this.db
                .collection('meditation_playlists')
                .where('createdBy', '==', userId)
                .where('isPublic', '==', false)
                .get();

            const userPlaylists = userPlaylistsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as MeditationPlaylist));

            return [...playlists, ...userPlaylists];
        }

        return playlists;
    }

    /**
     * Create meditation playlist
     */
    async createPlaylist(playlist: Omit<MeditationPlaylist, 'id' | 'createdAt'>): Promise<string> {
        const docRef = await this.db.collection('meditation_playlists').add({
            ...playlist,
            createdAt: FieldValue.serverTimestamp()
        });

        return docRef.id;
    }

    /**
     * Get recommended music for meditation based on mood and BPM
     */
    async getRecommendedMusic(mood: string, bpmPreference: 'slow' | 'medium' | 'energetic' = 'medium'): Promise<any[]> {
        const bpmRanges = {
            slow: { min: 60, max: 80 },
            medium: { min: 80, max: 100 },
            energetic: { min: 100, max: 120 }
        };

        const range = bpmRanges[bpmPreference];

        // Query music tracks
        let query = this.db
            .collection('music_tracks')
            .where('status', '==', 'COMPLETED');

        // Filter by mood tag if provided
        if (mood) {
            query = query.where('tags', 'array-contains', mood.toLowerCase()) as any;
        }

        const snapshot = await query.limit(20).get();

        // Filter by BPM in memory (since Firestore doesn't support range queries with other filters)
        const tracks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter((track: any) => {
                if (!track.bpm) return true; // Include tracks without BPM
                return track.bpm >= range.min && track.bpm <= range.max;
            });

        return tracks;
    }
}

export const meditationService = new MeditationService();
