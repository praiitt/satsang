'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string | null;
}

interface TranscriptDetail {
    roomName: string;
    agentName: string;
    userId: string;
    transcript: TranscriptMessage[];
    recordingUrl: string | null;
    createdAt: string | null;
}

function formatTime(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function TranscriptDetailPage() {
    const router = useRouter();
    const params = useParams<{ roomName: string }>();
    const roomName = decodeURIComponent(params.roomName ?? '');

    const [data, setData] = useState<TranscriptDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomName) return;
        fetch(`/api/transcripts/${encodeURIComponent(roomName)}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) throw new Error(d.error);
                setData(d);
                setLoading(false);
            })
            .catch((e) => {
                setError(e.message);
                setLoading(false);
            });
    }, [roomName]);

    const agentLabel = data?.agentName?.replace(/-agent$/, '').replace(/-/g, ' ') ?? 'Agent';

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a0a2e] text-white flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => router.push('/conversations')}
                    className="text-zinc-400 hover:text-white transition-colors text-xl"
                >
                    ←
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="font-semibold capitalize truncate">{agentLabel}</h1>
                    {data?.createdAt && (
                        <p className="text-xs text-zinc-500">
                            {new Date(data.createdAt).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </p>
                    )}
                </div>
            </div>

            {/* Audio Player */}
            {data?.recordingUrl && (
                <div className="px-4 py-3 bg-purple-900/20 border-b border-purple-500/20">
                    <p className="text-xs text-purple-300 mb-1">🎙️ Session Recording</p>
                    <audio controls className="w-full h-10 accent-purple-500" src={data.recordingUrl}>
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {loading && (
                    <div className="text-center py-16 text-zinc-500 animate-pulse">Loading transcript…</div>
                )}
                {error && (
                    <div className="text-center py-16 text-red-400">{error}</div>
                )}

                {!loading && !error && data && (
                    <>
                        {data.transcript.length === 0 && (
                            <p className="text-center text-zinc-500 py-16">No messages were recorded in this session.</p>
                        )}
                        <div className="space-y-4 max-w-2xl mx-auto">
                            {data.transcript.map((msg, i) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser
                                                    ? 'bg-purple-600/70 text-white rounded-br-sm'
                                                    : 'bg-white/8 text-zinc-200 rounded-bl-sm border border-white/10'
                                                }`}
                                        >
                                            {msg.content}
                                            {msg.timestamp && (
                                                <p className="text-[10px] text-zinc-400 mt-1 text-right">
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Continue conversation button */}
            {data && (
                <div className="sticky bottom-0 bg-black/40 backdrop-blur-md border-t border-white/10 px-4 py-3">
                    <button
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-amber-500 hover:opacity-90 font-semibold text-white transition-opacity"
                        onClick={() => {
                            // Navigate back to the agent — the agent will reload context from firebase
                            const agentPath = data.agentName?.includes('osho') ? '/agents/osho'
                                : data.agentName?.includes('vedic') ? '/agents/vedic-astrology'
                                    : data.agentName?.includes('music') ? '/agents/music'
                                        : data.agentName?.includes('hinduism') ? '/agents/hinduism'
                                            : data.agentName?.includes('tarot') ? '/agents/tarot'
                                                : data.agentName?.includes('psychedelic') ? '/agents/psychedelic'
                                                    : '/';
                            router.push(agentPath);
                        }}
                    >
                        Continue Conversation →
                    </button>
                </div>
            )}
        </div>
    );
}
