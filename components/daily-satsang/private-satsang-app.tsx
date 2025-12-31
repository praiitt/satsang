'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer, RoomContext, StartAudio, useChat } from '@livekit/components-react';
import { Toaster } from '@/components/livekit/toaster';
import { YouTubeBhajanPlayer } from '@/components/youtube/youtube-bhajan-player';
import { SatsangSessionView } from './satsang-session-view';
import { deductSatsangCoins } from '@/lib/services/coinDeduction';
import { useRouter } from 'next/navigation';

// Reuse AgentWaitHandler to prevent early speaking
function AgentWaitHandler({ room, isConnected }: { room: Room | null; isConnected: boolean }) {
    const { send } = useChat();
    const waitSentRef = useMemo(() => ({ current: false }), []);

    useEffect(() => {
        if (!room || !isConnected || waitSentRef.current) return;

        // Send wait message via chat to tell agent not to respond yet
        const waitMessage = `[WAIT MODE - DO NOT RESPOND YET]

कृपया प्रतीक्षा करें। सत्र अभी शुरू नहीं हुआ है। 

महत्वपूर्ण: अभी कुछ न बोलें, कोई अभिवादन न करें, और कोई प्रतिक्रिया न दें। 

जब मैं (होस्ट) "शुरू करें" बटन दबाऊंगा, तभी आपको बोलना शुरू करना होगा। तब तक चुप रहें।`;

        void send(waitMessage);
        waitSentRef.current = true;
        console.log('[PrivateSatsang] Sent wait message to agent');
    }, [room, isConnected, send, waitSentRef]);

    return null;
}

interface PrivateSatsangAppProps {
    guruId: string;
    guruName: string;
}

export function PrivateSatsangApp({ guruId, guruName }: PrivateSatsangAppProps) {
    const [topic, setTopic] = useState('');
    const [isTopicSelected, setIsTopicSelected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [participantName, setParticipantName] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); // Add generating state
    const sessionStartTimeRef = useRef<number | null>(null);
    const router = useRouter();

    const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
    const [satsangPlan, setSatsangPlan] = useState<any>(null); // Store full plan
    const [isPlanReady, setIsPlanReady] = useState(false);
    const [recentTopics, setRecentTopics] = useState<string[]>([]);

    // Fetch recent topics
    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await fetch(`/api/satsang/topics?guruId=${guruId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRecentTopics(data.topics || []);
                }
            } catch (e) {
                console.error('Failed to fetch recent topics', e);
            }
        };
        fetchTopics();
    }, [guruId]);

    // Handle topic submission -> Triggers Generation
    const handleTopicSubmit = async (selectedTopic: string) => {
        setTopic(selectedTopic);
        setIsTopicSelected(true);
        await generatePlan(selectedTopic);
    };

    const handleSurpriseMe = () => {
        const topics = [
            'मैं कौन हूँ? आत्म-अन्वेषण की यात्रा',
            'कर्म और भाग्य का रहस्य: क्या सब कुछ पूर्व निर्धारित है?',
            'मोक्ष क्या है और इसे इसी जीवन में कैसे प्राप्त करें?',
            'सांसारिक जीवन में रहते हुए ईश्वर की प्राप्ति कैसे संभव है?',
            'दुःख का मूल कारण और स्थायी आनंद का मार्ग',
            'मृत्यु के बाद आत्मा की यात्रा क्या है?',
            'वेदांत का सार: "तत् त्वम् असि" (वह तुम ही हो)',
            'मन को वश में कैसे करें और आंतरिक शांति कैसे पाएं?',
            'भक्ति योग vs ज्ञान योग: मेरे लिए क्या सही है?'
        ];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        handleTopicSubmit(randomTopic);
    };

    // 1. Generate Plan
    const generatePlan = async (selectedTopic: string) => {
        try {
            setIsGenerating(true);
            console.log('Generating satsang plan for:', selectedTopic);

            const genRes = await fetch('/api/satsang/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: selectedTopic,
                    guruId,
                    userId: 'user_' + Math.floor(Math.random() * 10000),
                    language: 'hi'
                }),
            });

            if (!genRes.ok) throw new Error('Failed to generate session plan');

            const { planId, plan } = await genRes.json();
            console.log('Generated Plan ID:', planId);

            setGeneratedPlanId(planId);
            setSatsangPlan(plan);
            setIsPlanReady(true); // Move to "Ready" state

        } catch (error) {
            console.error('Error generating plan:', error);
            // reset state to allow retry?
            setIsTopicSelected(false);
        } finally {
            setIsGenerating(false);
        }
    };

    // 2. Connect to Room (Triggered by user)
    const handleEnterSatsang = async () => {
        if (!generatedPlanId) return;

        try {
            const response = await fetch('/api/satsang/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guruId,
                    role: 'host',
                    planId: generatedPlanId
                }),
            });

            if (!response.ok) {
                console.error('Failed to get token');
                return;
            }

            const data = await response.json();
            setParticipantName(data.participantName);

            const newRoom = new Room({
                adaptiveStream: true,
                dynacast: true,
                publishDefaults: { simulcast: true },
            });

            setRoom(newRoom);

            await newRoom.connect(data.serverUrl, data.participantToken);
            setIsConnected(true);
            console.log('Connected to private satsang room:', newRoom.name);

            // Mark session start time for coin deduction
            sessionStartTimeRef.current = Date.now();

        } catch (error) {
            console.error('Error connecting to room:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (room && room.state !== 'disconnected') {
                room.disconnect();
            }
        };
    }, [room]);

    // Handle leave
    const handleLeave = async () => {
        if (sessionStartTimeRef.current) {
            const durationMinutes = (Date.now() - sessionStartTimeRef.current) / 1000 / 60;
            if (durationMinutes > 0.5) { // Only deduct if session > 30s
                try {
                    // Check if user is authenticated via Firebase (vs guest user)
                    // The component uses random user ID for guest access which causes coin auth to fail
                    // We can verify this via coin service client-side check implicitly, but better to skip if we know we are guest.
                    // For now, let's just wrap and silence the specific auth error if it's a guest.
                    await deductSatsangCoins(durationMinutes, { type: 'private-satsang', guruId });
                } catch (e: any) {
                    // Ignore auth errors for guest users, log others
                    if (!e.message?.includes('No authorization token')) {
                        console.error('Failed to deduct coins', e);
                    }
                }
            }
        }

        if (room && room.state !== 'disconnected') {
            room.disconnect();
        }
        setRoom(null);
        setIsConnected(false);
        router.push(`/hinduism/${guruId}`);
    };

    if (!isTopicSelected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 relative overflow-hidden font-sans">
                {/* Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm transform scale-105"
                    style={{ backgroundImage: `url('/images/gurus/${guruId}.jpg'), url('/images/placeholder-guru.jpg')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                <div className="relative z-10 w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="space-y-2">
                        <p className="text-orange-400 font-medium tracking-widest text-xs uppercase">Private Session</p>
                        <h1 className="text-3xl md:text-4xl font-serif font-light text-orange-50">
                            {guruName}
                        </h1>
                    </div>

                    <p className="text-gray-300 text-lg font-light leading-relaxed">
                        किस विषय पर मार्गदर्शन प्राप्त करना चाहते हैं?
                    </p>

                    <div className="space-y-4 pt-4">
                        <input
                            type="text"
                            placeholder="विषय लिखें (उदा. मन की शांति)"
                            className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 backdrop-blur-md transition-all text-center text-lg"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && topic && handleTopicSubmit(topic)}
                        />

                        <button
                            onClick={() => topic && handleTopicSubmit(topic)}
                            disabled={!topic}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-semibold text-white shadow-xl shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-500 hover:to-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Start Satsang
                        </button>

                        <div className="relative flex py-4 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink mx-4 text-gray-500 text-sm font-light">or</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <button
                            onClick={handleSurpriseMe}
                            className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-orange-200/80 hover:text-orange-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <span>✨</span> Suggest a Topic
                        </button>

                        {recentTopics.length > 0 && (
                            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
                                <p className="text-xs text-center text-white/40 mb-3 uppercase tracking-widest">Recently Discussed</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {recentTopics.map((t, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleTopicSubmit(t)}
                                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 text-xs text-gray-300 hover:text-orange-200 transition-all cursor-pointer whitespace-nowrap"
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white relative overflow-hidden">
                {/* Guru Background for Loading/Ready State */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                    style={{ backgroundImage: `url('/images/gurus/${guruId}.jpg')` }}
                />
                <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 space-y-6 animate-in fade-in zoom-in duration-300">

                    {isPlanReady ? (
                        // Session Ready State
                        <>
                            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-2 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                                <span className="text-3xl">🕉️</span>
                            </div>

                            <h2 className="text-2xl font-serif text-orange-50">Satsang is Ready</h2>
                            <p className="text-gray-300 text-center font-light">
                                Your spiritual session on <br />
                                <span className="text-orange-300 font-medium">"{topic}"</span><br />
                                has been prepared.
                            </p>

                            <button
                                onClick={handleEnterSatsang}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-semibold text-white shadow-xl shadow-orange-900/40 hover:from-orange-500 hover:to-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>Start Satsang</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </button>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                Click to connect. The Guru is waiting.
                            </p>
                        </>
                    ) : (
                        // Generating State
                        <>
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                            <p className="text-lg font-light tracking-wide text-center">
                                {isGenerating
                                    ? `Preparing your spiritual journey on "${topic}"...`
                                    : "Connecting..."}
                            </p>
                            {isGenerating && (
                                <p className="text-sm text-gray-400 mt-2 text-center">Creating custom discourse and selecting bhajan...</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <RoomContext.Provider value={room}>
            <RoomAudioRenderer />
            <StartAudio label="Start Audio" />

            {/* Wait handler to keep agent silent until session starts */}
            <AgentWaitHandler room={room} isConnected={isConnected} />

            <SatsangSessionView
                room={room}
                guruName={guruName}
                guruId={guruId}
                durations={{ intro: 120, bhajan: 300, pravachan: 600, qa: 900, closing: 180 }}
                onLeave={handleLeave}
                initialTopic={topic}
                bhajanVideoId={satsangPlan?.bhajan_video_id}
            />

            {/* Hidden Components */}
            <div className="hidden">
                {/* YouTube player handles bhajan playback via data channel */}
                <YouTubeBhajanPlayer />
            </div>

            <Toaster />
        </RoomContext.Provider>
    );
}
