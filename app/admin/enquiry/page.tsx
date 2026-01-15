'use client';

import React, { useState, useCallback } from 'react';
import { EnquiryAgentInterface } from '@/components/admin/enquiry-agent-interface';
import { Button } from '@/components/livekit/button';
import { Loader2, Sparkles } from 'lucide-react';

export default function EnquiryAgentPage() {
    const [connectionDetails, setConnectionDetails] = useState<{
        token: string;
        url: string;
    } | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connectToAgent = useCallback(async () => {
        setIsConnecting(true);
        setError(null);
        try {
            const response = await fetch('/api/connection-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_config: {
                        agents: [{ agent_name: 'chitragupta' }]
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get connection details');
            }

            const data = await response.json();
            setConnectionDetails({
                token: data.participantToken,
                url: data.serverUrl,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const handleDisconnect = () => {
        setConnectionDetails(null);
    };

    if (connectionDetails) {
        return (
            <EnquiryAgentInterface
                accessToken={connectionDetails.token}
                url={connectionDetails.url}
                onDisconnect={handleDisconnect}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            <div className="relative z-10 max-w-lg w-full text-center space-y-8">
                <div className="space-y-4">
                    <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/20 rotate-3 hover:rotate-6 transition-transform duration-500">
                        <Sparkles className="h-10 w-10 text-slate-900" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">
                        Chitragupta
                    </h1>
                    <p className="text-lg text-slate-400">
                        The Divine Record Keeper. Talk to your database, analyze collections, and gain insights through voice.
                    </p>
                </div>

                {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <Button
                    size="lg"
                    onClick={connectToAgent}
                    disabled={isConnecting}
                    className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02]"
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        "Connect to Database"
                    )}
                </Button>

                <p className="text-xs text-slate-600">
                    Internal Tool • Authorized Personnel Only
                </p>
            </div>
        </div>
    );
}
