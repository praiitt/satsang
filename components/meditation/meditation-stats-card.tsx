'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchMeditationStats, type MeditationStats } from '@/lib/api/meditation';
import { Card } from '@/components/ui/card';
import { Flame, Clock, Calendar, TrendingUp } from 'lucide-react';

export function MeditationStatsCard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<MeditationStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            fetchMeditationStats(user.uid)
                .then(setStats)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user?.uid]);

    if (loading) {
        return (
            <Card className="p-6 bg-white/10 backdrop-blur border-white/20">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                    <div className="h-8 bg-white/20 rounded"></div>
                </div>
            </Card>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Current Streak */}
            <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur border-white/30">
                <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-white/80 text-sm font-medium">Streak</span>
                </div>
                <div className="text-3xl font-bold text-white">
                    {stats.currentStreak}
                    <span className="text-lg text-white/60 ml-1">days</span>
                </div>
                {stats.longestStreak > stats.currentStreak && (
                    <div className="text-xs text-white/50 mt-1">
                        Best: {stats.longestStreak} days
                    </div>
                )}
            </Card>

            {/* Total Sessions */}
            <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur border-white/30">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="text-white/80 text-sm font-medium">Sessions</span>
                </div>
                <div className="text-3xl font-bold text-white">
                    {stats.totalSessions}
                </div>
                <div className="text-xs text-white/50 mt-1">
                    Total practices
                </div>
            </Card>

            {/* Total Minutes */}
            <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur border-white/30">
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-white/80 text-sm font-medium">Time</span>
                </div>
                <div className="text-3xl font-bold text-white">
                    {stats.totalMinutes}
                    <span className="text-lg text-white/60 ml-1">min</span>
                </div>
                <div className="text-xs text-white/50 mt-1">
                    {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m total
                </div>
            </Card>

            {/* Mood Improvement */}
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur border-white/30">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="text-white/80 text-sm font-medium">Mood</span>
                </div>
                <div className="text-2xl font-bold text-white">
                    {calculateMoodImprovement(stats)}
                </div>
                <div className="text-xs text-white/50 mt-1">
                    Feeling better
                </div>
            </Card>
        </div>
    );
}

function calculateMoodImprovement(stats: MeditationStats): string {
    const before = stats.moodTrends.before;
    const after = stats.moodTrends.after;

    const stressedBefore = before['stressed'] || 0;
    const peacefulAfter = after['peaceful'] || 0;
    const joyfulAfter = after['joyful'] || 0;

    const positiveAfter = peacefulAfter + joyfulAfter;
    const total = stats.totalSessions;

    if (total === 0) return '0%';

    const improvement = Math.round((positiveAfter / total) * 100);
    return `${improvement}%`;
}
