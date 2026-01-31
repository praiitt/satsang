'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchMeditationSessions, type MeditationSession } from '@/lib/api/meditation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Clock, Music, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Helper to safely parse date
const safeDate = (date: any): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date === 'string') return new Date(date);
    if (typeof date === 'number') return new Date(date);
    // Handle Firestore Timestamp { _seconds: ..., _nanoseconds: ... }
    if (date._seconds) return new Date(date._seconds * 1000);
    if (date.seconds) return new Date(date.seconds * 1000);
    return new Date();
};
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

export function RecentSessionsList() {
    const { user } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<MeditationSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            fetchMeditationSessions(user.uid, 5)
                .then(setSessions)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user?.uid]);

    const handleResume = (sessionId: string) => {
        // Navigate to meditation page with resume param
        router.push(`/business/meditation?resumeSessionId=${sessionId}`);
    };

    if (loading) {
        return (
            <Card className="p-6 bg-white/10 backdrop-blur border-white/20">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-white/10 rounded"></div>
                    ))}
                </div>
            </Card>
        );
    }

    if (sessions.length === 0) {
        return (
            <Card className="p-8 bg-white/10 backdrop-blur border-white/20 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-300" />
                <p className="text-white/80 mb-2">No sessions yet</p>
                <p className="text-white/50 text-sm">Start your first meditation to begin your journey</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-white text-lg font-semibold mb-4">Recent Sessions</h3>
            {sessions.map((session) => (
                <Card
                    key={session.id}
                    className="p-4 bg-white/10 backdrop-blur border-white/20 hover:bg-white/15 transition-colors"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-white font-medium">{session.intention}</span>
                                {session.agentGuided && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                                        AI Guided
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-white/60">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.floor(session.duration / 60)} min
                                </div>

                                <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    <MoodBadge mood={session.mood_before} />
                                    {session.mood_after && (
                                        <>
                                            <span>→</span>
                                            <MoodBadge mood={session.mood_after} />
                                        </>
                                    )}
                                </div>

                                {session.musicUsed.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Music className="w-3 h-3" />
                                        {session.musicUsed.length} tracks
                                    </div>
                                )}
                            </div>

                            {session.completedAt && (
                                <div className="text-xs text-white/40 mt-2">
                                    {formatDistanceToNow(safeDate(session.completedAt), { addSuffix: true })}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            {/* Transcript Dialog */}
                            {session.chatHistory && session.chatHistory.length > 0 && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View Transcript">
                                            <MessageSquare className="w-4 h-4 text-white/70" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Session Transcript</DialogTitle>
                                        </DialogHeader>
                                        <ScrollArea className="h-[400px] mt-4 pr-4">
                                            <div className="space-y-4">
                                                {session.chatHistory.map((msg: any, idx: number) => (
                                                    <div key={idx} className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                                                        <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${msg.role === 'assistant'
                                                            ? 'bg-white/10 text-white/90'
                                                            : 'bg-purple-600/30 text-white/90'
                                                            }`}>
                                                            {msg.content}
                                                        </div>
                                                        <span className="text-[10px] text-white/30 mt-1 px-1">
                                                            {msg.role === 'assistant' ? 'Guide' : 'You'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                            )}

                            {/* Resume Button */}
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 bg-white/5 border-white/20 hover:bg-white/20 text-xs gap-1"
                                onClick={() => handleResume(session.id)}
                            >
                                <RefreshCw className="w-3 h-3" />
                                Resume
                            </Button>
                        </div>
                    </div>

                    {session.notes && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-sm text-white/70 italic">"{session.notes}"</p>
                        </div>
                    )}
                </Card>
            ))}
        </div>
    );
}

function MoodBadge({ mood }: { mood: string }) {
    const moodColors: Record<string, string> = {
        peaceful: 'text-blue-300',
        stressed: 'text-orange-300',
        joyful: 'text-yellow-300',
        tired: 'text-purple-300',
        neutral: 'text-gray-300',
    };

    const moodEmojis: Record<string, string> = {
        peaceful: '😌',
        stressed: '😰',
        joyful: '😊',
        tired: '😴',
        neutral: '😐',
    };

    return (
        <span className={moodColors[mood] || 'text-white'}>
            {moodEmojis[mood]} {mood}
        </span>
    );
}
