'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/livekit/button';
import { MessageSquare, Calendar, Bot, MessageSquarePlus, User } from 'lucide-react';
import { format } from 'date-fns';

interface TranscriptMessage {
    role: string;
    content: string;
    timestamp: number | string;
}

interface SessionTranscript {
    id: string;
    roomName: string;
    agentName: string;
    createdAt: string;
    transcript: TranscriptMessage[];
}

export function RecentChatsSection() {
    const { user, loading: authLoading } = useAuth();
    const [transcripts, setTranscripts] = useState<SessionTranscript[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (user?.uid) {
                setLoading(true);
                fetchTranscripts(user.uid)
                    .then(setTranscripts)
                    .catch(console.error)
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
                setTranscripts([]);
            }
        }
    }, [user?.uid, authLoading]);

    const fetchTranscripts = async (userId: string) => {
        try {
            const res = await fetch(`/api/auth-chat/transcripts?userId=${userId}&agentName=music-agent`, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch transcripts');
            const data = await res.json();
            return data.transcripts || [];
        } catch (error) {
            console.error('Error fetching transcripts:', error);
            return [];
        }
    };

    const handleContinueSession = (sessionId: string) => {
        const event = new CustomEvent('rraasi-start-session', {
            detail: { resumeSessionId: sessionId }
        });
        window.dispatchEvent(event);
    };

    if (authLoading) return null;
    
    // Only show if there are transcripts or if we are loading (to prevent layout shift)
    if (!loading && transcripts.length === 0) return null;

    return (
        <div className="mb-12 mt-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <MessageSquare className="h-6 w-6 text-purple-500" />
                        Continue Creating
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg hidden sm:block">
                        Pick up where you left off with the AI Music Agent
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="min-w-[280px] sm:min-w-[320px] h-32 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse flex items-center justify-center border border-gray-200 dark:border-gray-700/50">
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                    {transcripts.slice(0, 10).map((session) => {
                        const date = new Date(session.createdAt);
                        // Get the last meaningful message from the bot or user
                        const messages = session.transcript || [];
                        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                        const isAgent = lastMsg?.role === 'agent' || lastMsg?.role === 'assistant';

                        return (
                            <div 
                                key={session.id} 
                                className="group relative min-w-[280px] sm:min-w-[320px] max-w-[320px] flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#121225] border border-gray-200 dark:border-[#2a1a4a] shadow-sm dark:shadow-none hover:shadow-xl dark:hover:shadow-purple-900/20 transition-all duration-300 snap-start overflow-hidden isolate"
                            >
                                {/* Gradient Background Hover Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

                                <div className="flex flex-col gap-3 h-full">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-[#a78bfa]">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {format(date, 'MMM d, h:mm a')}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-center">
                                        {lastMsg ? (
                                            <div className="flex gap-2.5 items-start">
                                                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${isAgent ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'}`}>
                                                    {isAgent ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                </div>
                                                <p className="text-sm text-gray-800 dark:text-[#e2e2f0] line-clamp-2 leading-relaxed italic">
                                                    "{lastMsg.content}"
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 dark:text-[#6d6d8a] italic">Empty session</p>
                                        )}
                                    </div>
                                    
                                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-[#1a1a30]">
                                        <Button 
                                            onClick={() => handleContinueSession(session.id)}
                                            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a30] dark:hover:bg-[#2a2a4a] text-gray-900 dark:text-white rounded-xl transition-colors py-2.5 shadow-none border border-transparent dark:border-[#3a3a5a]"
                                        >
                                            <MessageSquarePlus className="h-4 w-4 text-purple-500" />
                                            <span className="font-bold text-sm">Continue Session</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
