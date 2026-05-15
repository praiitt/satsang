'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/livekit/button';
import { X, MessageSquare, Calendar, User, Bot, Loader2, Play, MessageSquarePlus } from 'lucide-react';
import { format } from 'date-fns';

export interface RecentChatsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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

export function RecentChatsModal({ isOpen, onClose }: RecentChatsModalProps) {
    const { user } = useAuth();
    const [transcripts, setTranscripts] = useState<SessionTranscript[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedChatId, setExpandedChatId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user?.uid) {
            setLoading(true);
            fetchTranscripts(user.uid)
                .then(setTranscripts)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen, user?.uid]);

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

    const handleContinueSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        onClose();
        const event = new CustomEvent('rraasi-start-session', {
            detail: { resumeSessionId: sessionId }
        });
        window.dispatchEvent(event);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-[#0f0f1e] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#2a1a4a]">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5 shrink-0 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold">Recent Agent Chats</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors hover:bg-white/10 p-2 rounded-full">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[#6d6d8a]">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                            <p>Loading your conversation history...</p>
                        </div>
                    ) : transcripts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[#6d6d8a]">
                            <div className="p-4 bg-[#1a1a2e] rounded-full mb-4">
                                <MessageSquare className="h-8 w-8 text-purple-400 opacity-50" />
                            </div>
                            <p className="text-lg font-medium text-[#e2e2f0]">No chats found</p>
                            <p className="mt-2 text-center max-w-xs">Start a session with the RRAASI Music Creator to see your chat history here.</p>
                        </div>
                    ) : (
                        transcripts.map((session) => {
                            const date = session.createdAt ? new Date(session.createdAt) : new Date();
                            const isExpanded = expandedChatId === session.id;
                            const messages = session.transcript || [];

                            return (
                                <div key={session.id} className="border border-[#1a1a30] rounded-xl overflow-hidden bg-[#121225]">
                                    {/* Session Header (Clickable) */}
                                    <button 
                                        onClick={() => setExpandedChatId(isExpanded ? null : session.id)}
                                        className="w-full text-left p-4 hover:bg-[#16162a] transition-colors flex items-center justify-between"
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-sm font-medium text-[#e2e2f0]">
                                                <Calendar className="h-4 w-4 text-purple-400" />
                                                {format(date, 'MMMM d, yyyy • h:mm a')}
                                            </div>
                                            <div className="text-xs text-[#6d6d8a] flex items-center gap-1.5">
                                                <span>{messages.length} messages</span>
                                                <span className="text-[#3a3a5a]">•</span>
                                                <span>Room: {session.roomName.substring(0, 8)}...</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={(e) => handleContinueSession(e, session.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-semibold rounded-full transition-colors"
                                            >
                                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                                Continue
                                            </button>
                                            <div className={`p-2 rounded-full bg-[#1a1a30] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Messages (Expanded state) */}
                                    {isExpanded && (
                                        <div className="p-4 border-t border-[#1a1a30] bg-[#0c0c16] space-y-4 max-h-[400px] overflow-y-auto">
                                            {messages.length === 0 ? (
                                                <p className="text-center text-[#6d6d8a] italic text-sm">No text messages recorded in this session.</p>
                                            ) : (
                                                <>
                                                {messages.map((msg, idx) => {
                                                    const isAgent = msg.role === 'agent' || msg.role === 'assistant';
                                                    return (
                                                        <div key={idx} className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
                                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAgent ? 'bg-purple-900/50 border border-purple-500/30' : 'bg-blue-900/50 border border-blue-500/30'}`}>
                                                                {isAgent ? <Bot className="h-4 w-4 text-purple-300" /> : <User className="h-4 w-4 text-blue-300" />}
                                                            </div>
                                                            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                                                                isAgent 
                                                                    ? 'bg-[#1a1a30] text-[#e2e2f0] rounded-tl-sm' 
                                                                    : 'bg-indigo-600/20 text-[#e2e2f0] border border-indigo-500/20 rounded-tr-sm'
                                                            }`}>
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="pt-4 mt-4 border-t border-[#1a1a30]/50 flex justify-center sticky bottom-0 bg-gradient-to-t from-[#0c0c16] via-[#0c0c16] to-transparent pb-1">
                                                    <button 
                                                        onClick={(e) => handleContinueSession(e, session.id)}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 w-full justify-center"
                                                    >
                                                        <MessageSquarePlus className="h-4 w-4" />
                                                        Continue This Conversation
                                                    </button>
                                                </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
