/**
 * Meditation API Client
 * Client-side functions for meditation endpoints
 */

const API_BASE = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_AUTH_SERVER_URL || '/satsang-auth-server')
  : (process.env.AUTH_SERVER_URL || 'http://localhost:4000');

export interface MeditationSession {
    id?: string;
    userId: string;
    intention: string;
    mood_before: 'peaceful' | 'stressed' | 'joyful' | 'tired' | 'neutral';
    mood_after?: 'peaceful' | 'stressed' | 'joyful' | 'tired' | 'neutral';
    musicUsed: string[];
    generatedMusic: boolean;
    duration: number;
    completedAt?: any;
    agentGuided: boolean;
    notes?: string;
    chatHistory?: Array<{ role: string; content: string; timestamp?: any }>;
}

export interface MeditationStats {
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

export interface MeditationPlaylist {
    id?: string;
    name: string;
    description: string;
    sessionType: 'morning' | 'evening' | 'celebration' | 'deep';
    trackIds: string[];
    duration: number;
    bpmRange: { min: number; max: number };
    createdBy: string;
    isOfficial: boolean;
    isPublic: boolean;
}

/**
 * Fetch user's meditation sessions
 */
export async function fetchMeditationSessions(
    userId: string,
    limit: number = 10
): Promise<MeditationSession[]> {
    const res = await fetch(`${API_BASE}/meditation/sessions?userId=${userId}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const data = await res.json();
    return data.sessions;
}

/**
 * Get specific session by ID
 */
export async function fetchMeditationSession(sessionId: string): Promise<MeditationSession> {
    const res = await fetch(`${API_BASE}/meditation/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    const data = await res.json();
    return data.session;
}

/**
 * Save completed meditation session
 */
export async function saveMeditationSession(
    session: Omit<MeditationSession, 'id' | 'completedAt'>
): Promise<string> {
    const res = await fetch(`${API_BASE}/meditation/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error('Failed to save session');
    const data = await res.json();
    return data.sessionId;
}

/**
 * Update post-meditation mood
 */
export async function updateSessionMood(
    sessionId: string,
    mood_after: string,
    notes?: string
): Promise<void> {
    const res = await fetch(`${API_BASE}/meditation/sessions/${sessionId}/mood`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_after, notes }),
    });
    if (!res.ok) throw new Error('Failed to update mood');
}

/**
 * Get user statistics
 */
export async function fetchMeditationStats(userId: string): Promise<MeditationStats> {
    const res = await fetch(`${API_BASE}/meditation/stats?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    return data.stats;
}

/**
 * Get meditation playlists
 */
export async function fetchMeditationPlaylists(
    userId?: string,
    sessionType?: string
): Promise<MeditationPlaylist[]> {
    let url = `${API_BASE}/meditation/playlists`;
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (sessionType) params.append('sessionType', sessionType);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch playlists');
    const data = await res.json();
    return data.playlists;
}

/**
 * Create custom playlist
 */
export async function createMeditationPlaylist(
    playlist: Omit<MeditationPlaylist, 'id' | 'createdAt'>
): Promise<string> {
    const res = await fetch(`${API_BASE}/meditation/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlist),
    });
    if (!res.ok) throw new Error('Failed to create playlist');
    const data = await res.json();
    return data.playlistId;
}

/**
 * Get recommended meditation music
 */
export async function fetchRecommendedMusic(
    mood: string = 'peaceful',
    bpmPreference: 'slow' | 'medium' | 'energetic' = 'medium'
): Promise<any[]> {
    const res = await fetch(
        `${API_BASE}/meditation/music/recommended?mood=${mood}&bpmPreference=${bpmPreference}`
    );
    if (!res.ok) throw new Error('Failed to fetch recommended music');
    const data = await res.json();
    return data.tracks;
}

/**
 * Create LiveKit meditation room
 */
export async function createMeditationRoom(userId: string, intention: string, mood: string) {
    const res = await fetch(`${API_BASE}/livekit/meditation-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            intention,
            mood,
            agentName: 'meditation-agent'
        }),
    });
    if (!res.ok) throw new Error('Failed to create meditation room');
    return res.json();
}
