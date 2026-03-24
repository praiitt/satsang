'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useLocalParticipant,
    useRemoteParticipants,
    useTracks,
    useChat,
} from '@livekit/components-react';
import { ChatTranscript } from '@/components/app/chat-transcript';
import { Button } from '@/components/livekit/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Database, Server, Info, Terminal, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Room, Track } from 'livekit-client';

interface EnquiryAgentInterfaceProps {
    accessToken: string;
    url: string;
    onDisconnect: () => void;
}

export function EnquiryAgentInterface({ accessToken, url, onDisconnect }: EnquiryAgentInterfaceProps) {
    const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
    const [room, setRoom] = useState<Room | null>(null);

    return (
        <LiveKitRoom
            token={accessToken}
            serverUrl={url}
            connect={true}
            audio={isMicrophoneEnabled}
            video={false}
            onDisconnected={onDisconnect}
            onConnected={(r) => setRoom(r)}
            className="flex flex-col h-[calc(100vh-4rem)] w-full bg-slate-950 text-amber-50 overflow-hidden font-sans"
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-amber-900/30 bg-slate-950/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <Database className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                            Chitragupta
                        </h1>
                        <p className="text-xs text-amber-400/60 uppercase tracking-widest font-medium">Divine Record Keeper</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", room?.state === 'connected' ? "bg-emerald-500" : "bg-amber-500")} />
                        <span className="text-xs font-mono text-slate-400">{room?.state === 'connected' ? 'CONNECTED' : 'CONNECTING...'}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-amber-900/20 hover:text-amber-200 text-amber-400/60"
                        onClick={() => setIsMicrophoneEnabled(!isMicrophoneEnabled)}
                    >
                        {isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>
                    <Button
                        variant="outline"
                        className="border-amber-900/50 text-amber-200 hover:bg-amber-900/20 hover:text-amber-100 uppercase text-xs tracking-wider"
                        onClick={onDisconnect}
                    >
                        Disconnect
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 gap-12">
                <RoomAudioRenderer />

                <div className="flex flex-col gap-4 w-full max-w-2xl">
                    <VisualizerState room={room} />
                    <AgentChat />
                </div>

                <SampleQueries />
            </main>

            {/* Footer / Captions could go here */}
            <footer className="relative z-10 p-6 text-center text-slate-600 text-sm font-mono border-t border-slate-900/50">
                SECURE CONNECTION • READ-ONLY ACCESS • FIRESTORE PROTOCOL v1.0
            </footer>
        </LiveKitRoom>
    );
}

function VisualizerState({ room }: { room: Room | null }) {
    const remoteParticipants = useRemoteParticipants();
    const agents = remoteParticipants.filter((p) => p.isAgent);
    const agent = agents.length > 0 ? agents[0] : undefined;
    
    const audioTracks = useTracks([Track.Source.Microphone], { onlySubscribed: true })
        .filter((t) => t.participant.isAgent);
    const audioTrack = audioTracks.length > 0 ? audioTracks[0] : undefined;
    
    const state = !agent ? 'idle' : (agent.isSpeaking ? 'speaking' : 'listening');

    const [volume, setVolume] = useState(0);

    useEffect(() => {
        if (!audioTrack) return;

        // Simple volume simulation for visualizer since we don't have direct audio analysis in this simplified component
        // In a real app, we'd attach an AudioContext analyzer
        const interval = setInterval(() => {
            // Random fluctuation base + boost when 'speaking'
            const base = state === 'speaking' ? 0.4 : 0.05;
            setVolume(Math.random() * 0.3 + base);
        }, 100);

        return () => clearInterval(interval);
    }, [state, audioTrack]);

    return (
        <div className="relative flex items-center justify-center w-full max-w-2xl h-64">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-amber-500/5 blur-[100px] rounded-full animate-pulse-slow" />

            <AnimatePresence mode="wait">
                {state === 'listening' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-center"
                    >
                        <div className="relative flex items-center justify-center h-32 w-32">
                            <div className="absolute inset-0 h-32 w-32 rounded-full border-2 border-amber-500/30 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                                <div className="h-24 w-24 rounded-full border border-amber-500/50 border-dashed" />
                            </div>
                            <Mic className="relative z-10 h-8 w-8 text-amber-500 animate-pulse" />
                        </div>
                        <p className="mt-6 text-amber-200/80 font-light tracking-wide">Listening for your query...</p>
                    </motion.div>
                )}

                {state === 'speaking' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                    >
                        {/* Waveform Visualization (Simulated) */}
                        <div className="flex items-center gap-1.5 h-32">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-3 bg-gradient-to-t from-amber-600 to-amber-300 rounded-full"
                                    animate={{
                                        height: [20, Math.random() * 100 + 30, 20]
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        repeat: Infinity,
                                        delay: i * 0.05
                                    }}
                                />
                            ))}
                        </div>
                        <p className="mt-8 text-amber-400 font-medium tracking-wide flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Analyzing Database...
                        </p>
                    </motion.div>
                )}

                {(state === 'idle' || state === 'connecting') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="h-4 w-4 rounded-full bg-amber-500 animate-ping mb-4" />
                        <p className="text-slate-500 font-mono text-sm">Standby Mode</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function AgentChat() {
    const { chatMessages } = useChat({ topic: "lk-chat-topic" });

    return (
        <div className="h-64 w-full bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                <ChatTranscript messages={chatMessages} />
            </div>
            {chatMessages.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                    No messages yet...
                </div>
            )}
        </div>
    );
}

function SampleQueries() {
    const queries = [
        "How many music tracks are in the database?",
        "Show me the top 3 users by coin balance.",
        "List all available collections.",
        "What is the schema for the organizations collection?"
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
            {queries.map((q, i) => (
                <button
                    key={i}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 transition-all text-left"
                    onClick={() => { /* Could auto-inject text if we had text input */ }}
                >
                    <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                        <Terminal className="h-4 w-4 text-slate-400 group-hover:text-amber-400" />
                    </div>
                    <span className="text-sm text-slate-300 group-hover:text-amber-100 font-medium">{q}</span>
                </button>
            ))}
        </div>
    );
}
