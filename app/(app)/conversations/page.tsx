'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

interface TranscriptSummary {
    id: string;
    roomName: string;
    agentName: string;
    messageCount: number;
    createdAt: string | null;
}

const AGENT_EMOJI: Record<string, string> = {
    guruji: '🕉️',
    osho: '🌸',
    'music-agent': '🎵',
    'vedic-astrology-agent': '🔮',
    'hinduism-agent': '🪔',
    'tarot-agent': '🃏',
    'psychedelic-agent': '🌀',
    chitragupta: '📖',
    default: '💬',
};

function agentEmoji(agentName: string): string {
    for (const [key, emoji] of Object.entries(AGENT_EMOJI)) {
        if (agentName?.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return AGENT_EMOJI.default;
}

function formatDate(iso: string | null): string {
    if (!iso) return 'Unknown date';
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ConversationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [transcripts, setTranscripts] = useState<TranscriptSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) return;
        setLoading(true);
        fetch(`/api/transcripts?userId=${user.uid}`)
            .then((r) => r.json())
            .then((data) => {
                setTranscripts(data.transcripts ?? []);
                setLoading(false);
            })
            .catch((e) => {
                setError('Could not load conversations.');
                setLoading(false);
                console.error(e);
            });
    }, [user?.uid]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a0a2e] text-white px-4 py-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-amber-300 bg-clip-text text-transparent">
                        Past Conversations
                    </h1>
                    <p className="text-zinc-400 mt-1 text-sm">Your sessions with all spiritual guides</p>
                </div>

                {loading && (
                    <div className="text-center py-16 text-zinc-500 animate-pulse">Loading conversations…</div>
                )}

                {error && (
                    <div className="text-center py-16 text-red-400">{error}</div>
                )}

                {!loading && !error && transcripts.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <p className="text-4xl mb-4">🕊️</p>
                        <p>No conversations yet. Start talking with an agent!</p>
                    </div>
                )}

                <div className="space-y-3">
                    {transcripts.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => router.push(`/conversations/${encodeURIComponent(t.roomName)}`)}
                            className="w-full text-left rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all duration-200 p-4 flex items-center gap-4"
                        >
                            <span className="text-3xl">{agentEmoji(t.agentName)}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white capitalize truncate">
                                    {t.agentName?.replace(/-agent$/, '').replace(/-/g, ' ')}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {t.messageCount} messages · {formatDate(t.createdAt)}
                                </p>
                            </div>
                            <span className="text-zinc-600 text-lg">›</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
