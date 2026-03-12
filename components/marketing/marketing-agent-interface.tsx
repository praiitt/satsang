'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useRemoteParticipants,
    useLocalParticipant,
    useTracks,
    useChat,
    useDataChannel,
    useTrackTranscription,
} from '@livekit/components-react';
import { ChatTranscript } from '@/components/app/chat-transcript';
import { Button } from '@/components/livekit/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Terminal, Activity, Sparkles, Send, X,
    CheckCircle, Loader2, Edit3, ImageIcon, Hash, ExternalLink,
    Video, Play, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Room, Track, TrackPublication, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createTrackReferenceOrPlaceholder } from '@livekit/components-core';

const API = '/api/marketing/ads';

const AVATAR_OPTIONS = [
    { id: 'f31ce977d65e47caa3e92a46703d6b1f', name: 'Rraasi Brand Avatar', type: 'Talking Photo' },
    { id: 'Anna_public_3_20240108', name: 'Anna (Professional)', type: 'Video Avatar' },
    { id: 'Susan_public_2_20240108', name: 'Susan (Casual)', type: 'Video Avatar' },
    { id: 'Edward_public_1_20240108', name: 'Edward (Corporate)', type: 'Video Avatar' },
];

interface MarketingAgentInterfaceProps {
    accessToken: string;
    url: string;
    onDisconnect: () => void;
}

interface PostPreview {
    briefId: string;
    variantId: string;
    imageVariantId?: string;
    platform: string;
    caption: string;
    hashtags: string[];
    imageUrl?: string;
    videoUrl?: string;
    videoStatus?: string;
    videoId?: string;
    topic: string;
    cta: string;
}

export function MarketingAgentInterface({ accessToken, url, onDisconnect }: MarketingAgentInterfaceProps) {
    const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
    const [room, setRoom] = useState<Room | null>(null);
    const [postPreview, setPostPreview] = useState<PostPreview | null>(null);

    const handlePreviewData = useCallback((payload: PostPreview) => {
        setPostPreview(payload);
    }, []);

    return (
        <LiveKitRoom
            token={accessToken}
            serverUrl={url}
            connect={true}
            audio={isMicrophoneEnabled}
            video={false}
            onDisconnected={onDisconnect}
            onConnected={(r) => setRoom(r)}
            className="flex flex-col h-[600px] w-full bg-slate-950 text-indigo-50 overflow-hidden font-sans rounded-2xl border border-indigo-900/30 relative"
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-indigo-900/30 bg-slate-950/50 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-indigo-500">
                            Chitragupta
                        </h2>
                        <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest font-medium">Marketing Advisor</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/50 border border-slate-800">
                        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", room?.state === 'connected' ? "bg-emerald-500" : "bg-indigo-500")} />
                        <span className="text-[10px] font-mono text-slate-400">{room?.state === 'connected' ? 'CONNECTED' : 'CONNECTING...'}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-indigo-900/20 hover:text-indigo-200 text-indigo-400/60"
                        onClick={() => setIsMicrophoneEnabled(!isMicrophoneEnabled)}
                    >
                        {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 text-[10px] border-indigo-900/50 text-indigo-200 hover:bg-indigo-900/20 hover:text-indigo-100 uppercase tracking-wider"
                        onClick={onDisconnect}
                    >
                        Disconnect
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
                <RoomAudioRenderer />
                <PreviewListener onPreview={handlePreviewData} />

                <div className="flex gap-4 w-full h-full min-h-0">
                    {/* Visualizer */}
                    <div className="w-1/3 flex flex-col items-center justify-center border-r border-indigo-900/20 pr-4 shrink-0">
                        <VisualizerState room={room} />
                    </div>

                    {/* Chat Side */}
                    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                        <AgentChat />
                    </div>
                </div>
            </main>

            {/* Post Preview Modal */}
            <AnimatePresence>
                {postPreview && (
                    <PostPreviewModal
                        preview={postPreview}
                        onClose={() => setPostPreview(null)}
                    />
                )}
            </AnimatePresence>
        </LiveKitRoom>
    );
}

// ── Invisible data-channel listener ──────────────────────────────────────────
function PreviewListener({ onPreview }: { onPreview: (p: PostPreview) => void }) {
    useDataChannel('chitragupta_preview', (msg) => {
        try {
            const text = new TextDecoder().decode(msg.payload);
            const data = JSON.parse(text);
            if (data.type === 'post_preview') {
                onPreview(data as PostPreview);
            }
        } catch (e) {
            console.error('Failed to parse preview data', e);
        }
    });
    return null;
}

// ── Visualizer ────────────────────────────────────────────────────────────────
function VisualizerState({ room }: { room: Room | null }) {
    const remoteParticipants = useRemoteParticipants();
    const agents = remoteParticipants.filter((p) => p.isAgent);
    const agent = agents.length > 0 ? agents[0] : undefined;
    const audioTracks = useTracks([Track.Source.Microphone], { onlySubscribed: true })
        .filter((t) => t.participant.isAgent);
    const audioTrack = audioTracks.length > 0 ? audioTracks[0] : undefined;
    const state = !agent ? 'idle' : (agent.isSpeaking ? 'speaking' : 'listening');
    const [, setVolume] = useState(0);

    useEffect(() => {
        if (!audioTrack) return;
        const interval = setInterval(() => {
            const base = state === 'speaking' ? 0.4 : 0.05;
            setVolume(Math.random() * 0.3 + base);
        }, 100);
        return () => clearInterval(interval);
    }, [state, audioTrack]);

    return (
        <div className="relative flex items-center justify-center w-full h-48">
            <div className="absolute inset-0 bg-indigo-500/5 blur-[50px] rounded-full animate-pulse" />
            <AnimatePresence mode="wait">
                {state === 'listening' && (
                    <motion.div key="listening" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center">
                        <div className="relative flex items-center justify-center h-20 w-20 mx-auto">
                            <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-indigo-500/30 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                                <div className="h-16 w-16 rounded-full border border-indigo-500/50 border-dashed" />
                            </div>
                            <Mic className="relative z-10 h-6 w-6 text-indigo-500 animate-pulse" />
                        </div>
                        <p className="mt-4 text-xs text-indigo-200/80 font-light tracking-wide">Listening...</p>
                    </motion.div>
                )}
                {state === 'speaking' && (
                    <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                        <div className="flex items-center gap-1 h-16">
                            {[...Array(8)].map((_, i) => (
                                <motion.div key={i} className="w-2 bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-full"
                                    animate={{ height: [10, Math.random() * 50 + 15, 10] }}
                                    transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }} />
                            ))}
                        </div>
                        <p className="mt-4 text-xs text-indigo-400 font-medium tracking-wide flex items-center gap-1.5">
                            <Activity className="h-3 w-3" /> Brainstorming...
                        </p>
                    </motion.div>
                )}
                {(state === 'idle') && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-indigo-500 animate-ping mb-3" />
                        <p className="text-slate-500 font-mono text-[10px]">Standby</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Chat with realtime transcription ─────────────────────────────────────────
function AgentChat() {
    const { chatMessages, send } = useChat({ topic: 'lk-chat-topic' });
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        send(inputValue);
        setInputValue('');
    };

    const queries = [
        "Draft a post about our Satsang service for Instagram.",
        "Show me a preview for a Tarot post on Facebook.",
        "What topics have we covered recently?",
    ];

    return (
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            {/* Transcript + Live text */}
            <div className="flex-1 bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden relative min-h-0">
                <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-3 space-y-3">
                    <ChatTranscript messages={chatMessages} />
                    {/* Real-time transcription rows */}
                    <LiveTranscriptions />
                </div>
                {chatMessages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs text-center px-4 pointer-events-none" style={{ zIndex: 0 }}>
                        Ask Chitragupta to draft a post and show you a preview before publishing.
                    </div>
                )}
            </div>

            {/* Suggestions */}
            {chatMessages.length === 0 && (
                <div className="flex flex-col gap-1 shrink-0">
                    {queries.map((q, i) => (
                        <button key={i} onClick={() => send(q)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all text-left group">
                            <Terminal className="h-3 w-3 text-slate-400 group-hover:text-indigo-400 shrink-0" />
                            <span className="text-[10px] text-slate-300 group-hover:text-indigo-100">{q}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="flex gap-2 shrink-0">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none" />
                <Button onClick={handleSend} disabled={!inputValue.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 px-3">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// ── Live Real-time Transcription ──────────────────────────────────────────────
function LiveTranscriptions() {
    const remoteParticipants = useRemoteParticipants();
    const { localParticipant } = useLocalParticipant();

    // Agent (Chitragupta) audio track
    const agentParticipant = remoteParticipants.find((p) => p.isAgent);
    const agentAudioTrack = agentParticipant
        ? Array.from(agentParticipant.trackPublications.values()).find(
              (pub) => pub.kind === Track.Kind.Audio && pub.trackSid
          )
        : undefined;

    // Local (user) mic track
    const localAudioTrack = localParticipant
        ? Array.from(localParticipant.trackPublications.values()).find(
              (pub) => pub.kind === Track.Kind.Audio && pub.trackSid
          )
        : undefined;

    const agentTrackRef = agentParticipant && agentAudioTrack
        ? { participant: agentParticipant, publication: agentAudioTrack, source: Track.Source.Microphone }
        : undefined;
    const localTrackRef = localParticipant && localAudioTrack
        ? { participant: localParticipant, publication: localAudioTrack as any, source: Track.Source.Microphone }
        : undefined;

    return (
        <>
            {agentTrackRef && <TranscriptionRow trackRef={agentTrackRef} label="Chitragupta" color="indigo" />}
            {localTrackRef && <TranscriptionRow trackRef={localTrackRef} label="You" color="emerald" />}
        </>
    );
}

interface TranscriptionRowProps {
    trackRef: any;
    label: string;
    color: 'indigo' | 'emerald';
}

function TranscriptionRow({ trackRef, label, color }: TranscriptionRowProps) {
    const { segments } = useTrackTranscription(trackRef);
    const lastSegment = segments[segments.length - 1];
    const isLive = lastSegment && !lastSegment.final;

    if (!lastSegment) return null;

    const colorMap = {
        indigo: { dot: 'bg-indigo-400', text: 'text-indigo-200', label: 'text-indigo-400', border: 'border-indigo-500/20 bg-indigo-500/5' },
        emerald: { dot: 'bg-emerald-400', text: 'text-emerald-100', label: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5' },
    };
    const c = colorMap[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg border px-3 py-2 ${c.border}`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                {isLive && (
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse`} />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.label}`}>{label}</span>
                {isLive && (
                    <span className={`text-[9px] ${c.label} opacity-60`}>live</span>
                )}
            </div>
            <p className={`text-xs leading-relaxed ${c.text} ${isLive ? 'opacity-70' : 'opacity-100'}`}>
                {lastSegment.text}
            </p>
        </motion.div>
    );
}

// ── Post Preview Approval Modal ───────────────────────────────────────────────
function PostPreviewModal({ preview, onClose }: { preview: PostPreview; onClose: () => void }) {
    const [caption, setCaption] = useState(preview.caption);
    const [hashtagInput, setHashtagInput] = useState((preview.hashtags || []).join(' '));
    const [publishing, setPublishing] = useState(false);
    const [published, setPublished] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const platformIcon: Record<string, string> = { instagram: '📷', twitter: '🐦', linkedin: '💼', facebook: '👥' };
    const platformColor: Record<string, string> = {
        instagram: 'from-purple-500 to-pink-500',
        twitter: 'from-sky-400 to-blue-500',
        linkedin: 'from-blue-600 to-blue-800',
        facebook: 'from-blue-500 to-indigo-600',
    };

    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [videoUrl, setVideoUrl] = useState(preview.videoUrl);
    const [videoStatus, setVideoStatus] = useState(preview.videoStatus || 'none');

    const defaultScript = preview.caption.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().substring(0, 500);
    const [showVideoConfig, setShowVideoConfig] = useState(false);
    const [customScript, setCustomScript] = useState(defaultScript);
    const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].id);

    const handleGenerateVideo = async () => {
        setGeneratingVideo(true);
        setError(null);
        setShowVideoConfig(false);
        try {
            const res = await fetch(`${API}/briefs/${preview.briefId}/generate-video`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    variantId: preview.variantId,
                    avatarId: selectedAvatar,
                    customScript: customScript
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);

            setVideoStatus('processing');
            startPollingVideo(data.videoId);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGeneratingVideo(false);
        }
    };

    const startPollingVideo = (vId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API}/briefs/${preview.briefId}/video-status?videoId=${vId}&variantId=${preview.variantId}`, {
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.status === 'ready') {
                    clearInterval(interval);
                    setVideoUrl(data.videoUrl);
                    setVideoStatus('ready');
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    setVideoStatus('failed');
                    setError('Video generation failed');
                }
            } catch (e) {
                console.error('Video poll error', e);
            }
        }, 5000);
    };

    const handlePublish = async () => {
        setPublishing(true);
        setError(null);
        try {
            // First patch the variant with edited caption
            await fetch(`${API}/briefs/${preview.briefId}/variants/${preview.variantId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caption, hashtags: hashtagInput.split(/\s+/).filter(h => h.startsWith('#')) }),
            }).catch(() => {}); // non-fatal

            // Get buffer channels
            const chRes = await fetch(`${API}/buffer/channels`, { credentials: 'include' });
            const chData = await chRes.json();
            if (!chData.configured || !chData.channels?.length) {
                throw new Error('Buffer not configured. Please connect Buffer in settings.');
            }
            const matching = chData.channels.filter((c: any) => c.service === preview.platform);
            const channelIds = (matching.length ? matching : chData.channels).map((c: any) => c._id || c.id);

            // Publish
            const pubRes = await fetch(`${API}/briefs/${preview.briefId}/publish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variantId: preview.variantId, channelIds }),
            });
            if (!pubRes.ok) {
                const e = await pubRes.json();
                throw new Error(e.error || 'Publish failed');
            }
            setPublished(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <motion.div
            key="preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-full overflow-y-auto shadow-2xl"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${platformColor[preview.platform] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-sm`}>
                            {platformIcon[preview.platform] || '🌐'}
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">Post Preview</p>
                            <p className="text-xs text-slate-400 capitalize">{preview.platform} · {preview.topic}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {showVideoConfig ? (
                    <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-white">Configure AI Video</h3>
                        </div>
                        
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                                <Video className="h-3 w-3" /> Select Avatar
                            </label>
                            <select 
                                value={selectedAvatar} 
                                onChange={e => setSelectedAvatar(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                            >
                                {AVATAR_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name} ({opt.type})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
                                <span className="flex items-center gap-1.5"><Edit3 className="h-3 w-3" /> Spoken Script</span>
                                <span className={customScript.length > 500 ? 'text-red-400' : ''}>{customScript.length}/500 chars</span>
                            </label>
                            <textarea
                                value={customScript}
                                onChange={(e) => setCustomScript(e.target.value)}
                                rows={5}
                                maxLength={500}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">This text will be spoken by the avatar. Max 500 characters.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button onClick={() => setShowVideoConfig(false)} variant="outline"
                                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                Cancel
                            </Button>
                            <Button onClick={handleGenerateVideo} disabled={generatingVideo || !customScript}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0 gap-2">
                                {generatingVideo ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="h-4 w-4" /> Start Generation</>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : published ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <CheckCircle className="h-16 w-16 text-emerald-500" />
                        <p className="text-white font-semibold text-lg">Published Successfully!</p>
                        <p className="text-slate-400 text-sm">Your post has been sent to Buffer for {preview.platform}.</p>
                        <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                            Close
                        </Button>
                    </div>
                ) : (
                    <div className="p-5 space-y-4">
                        {/* Media Preview (Image or Video) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Post Media</p>
                                {videoUrl && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-medium">
                                        ✨ Video Attached
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Image Preview */}
                                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square relative group">
                                    {preview.imageUrl ? (
                                        <img src={preview.imageUrl} alt="Generated post image"
                                            className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                            <ImageIcon className="h-8 w-8" />
                                            <span className="text-[10px]">No Image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] text-white font-semibold">IMAGE</div>
                                </div>

                                {/* Video Preview/Generate */}
                                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square relative flex flex-col">
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-600 text-[9px] text-white font-semibold z-10">VIDEO</div>
                                    
                                    {videoUrl ? (
                                        <div className="relative w-full h-full group">
                                            <video src={videoUrl} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors cursor-pointer"
                                                 onClick={() => window.open(videoUrl, '_blank')}>
                                                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                                    <Play className="h-5 w-5 text-white fill-white" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : videoStatus === 'processing' ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
                                            <Bot className="h-8 w-8 text-indigo-400 animate-bounce" />
                                            <p className="text-[10px] text-indigo-300 font-medium leading-tight">Generating Talking Avatar Video...</p>
                                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                                                <div className="h-full bg-indigo-500 animate-shimmer" style={{ width: '40%' }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                <Video className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-tight">Create a Reel with the Rraasi avatar</p>
                                            <Button 
                                                size="sm" 
                                                onClick={() => setShowVideoConfig(true)}
                                                disabled={generatingVideo}
                                                className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white border-0 px-3"
                                            >
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Configure AI Video
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Caption Editor */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                                <Edit3 className="h-3 w-3" /> Caption
                            </label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                rows={5}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                            />
                        </div>

                        {/* Hashtags Editor */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                                <Hash className="h-3 w-3" /> Hashtags
                            </label>
                            <textarea
                                value={hashtagInput}
                                onChange={(e) => setHashtagInput(e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-indigo-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none font-mono"
                            />
                        </div>

                        {/* Link to Ads Studio */}
                        <a href="/marketing/ads" target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            <ExternalLink className="h-3 w-3" />
                            View full brief in Ads Studio
                        </a>

                        {error && (
                            <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 text-xs text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button onClick={onClose} variant="outline"
                                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                Discard
                            </Button>
                            <Button onClick={handlePublish} disabled={publishing}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0 gap-2">
                                {publishing ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>
                                ) : (
                                    <><CheckCircle className="h-4 w-4" /> Approve & Publish</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
