'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer, RoomContext, StartAudio, useChat } from '@livekit/components-react';
import { Music2 } from 'lucide-react';
import { Toaster } from '@/components/livekit/toaster';
import { SatsangSessionView } from './satsang-session-view';
import { deductSatsangCoins } from '@/lib/services/coinDeduction';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { GuruPastRecordings } from '@/components/app/guru-past-recordings';
import { useLanguage } from '@/contexts/language-context';

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

        const sendMessage = async () => {
            try {
                if (room && room.localParticipant) {
                    const strData = new TextEncoder().encode(waitMessage);
                    await room.localParticipant.publishData(strData, { reliable: true, topic: "satsang_control" });
                    console.log('[PrivateSatsang] Published WAIT message to agent via data channel');
                } else {
                    await send(waitMessage);
                    console.log('[PrivateSatsang] Sent fallback lk-chat WAIT message to agent');
                }
            } catch (e) {
                console.warn('[PrivateSatsang] Failed to send wait message', e);
            }
        };
        void sendMessage();
        waitSentRef.current = true;
    }, [room, isConnected, send, waitSentRef]);

    return null;
}

interface PrivateSatsangAppProps {
    guruId: string;
    guruName: string;
    traditionSlug?: string;
    guruImage?: string;
}

export function PrivateSatsangApp({ guruId, guruName, traditionSlug = 'hinduism', guruImage }: PrivateSatsangAppProps) {
    const [topic, setTopic] = useState('');
    const [isTopicSelected, setIsTopicSelected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [participantName, setParticipantName] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const sessionStartTimeRef = useRef<number | null>(null);
    const router = useRouter();

    const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
    const [satsangPlan, setSatsangPlan] = useState<any>(null);
    const [isPlanReady, setIsPlanReady] = useState(false);
    const [recentTopics, setRecentTopics] = useState<{ topic: string, planId: string }[]>([]);
    const auth = useAuth();
    const { t, language } = useLanguage();
    const initialRandomIdRef = useRef('user_' + Math.floor(Math.random() * 10000));
    const userId = auth.user?.uid || initialRandomIdRef.current;
    const egressIdsRef = useRef<string[]>([]);

    // Song Reveal state (shown after session ends)
    const [songRevealTrack, setSongRevealTrack] = useState<{ title: string; audioUrl?: string; imageUrl?: string; status?: string; id?: string } | null>(null);
    const [songRevealVisible, setSongRevealVisible] = useState(false);
    const [lastRoomName, setLastRoomName] = useState<string | null>(null);
    const [prasadText, setPrasadText] = useState<string | null>(null);
    const songRevealAudioRef = useRef<HTMLAudioElement | null>(null);

    // Rraasi music fields (replaces YouTube video ID)
    const rawMeditationUrl = satsangPlan?.meditation_audio_url ?? null;
    const meditationAudioUrl = rawMeditationUrl ? `/api/music-proxy?url=${encodeURIComponent(rawMeditationUrl)}` : null;
    const meditationTitle = satsangPlan?.meditation_title ?? null;
    const meditationImageUrl = satsangPlan?.meditation_image_url ?? null;

    // Fetch AI Smart Topics
    const [isFetchingTopics, setIsFetchingTopics] = useState(true);

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                setIsFetchingTopics(true);
                const uid = auth.user?.uid || '';
                const lang = language || 'hi';
                const res = await fetch(`/api/satsang/smart-topics?guruId=${guruId}&userId=${uid}&language=${lang}`);
                if (res.ok) {
                    const data = await res.json();
                    setRecentTopics(data.topics || []);
                }
            } catch (error) {
                console.error('Error fetching smart topics:', error);
            } finally {
                setIsFetchingTopics(false);
            }
        };
        fetchTopics();
    }, [guruId, auth.user?.uid, language]);

    // Poll for track updates if the song is still pending
    useEffect(() => {
        if (!songRevealVisible || !songRevealTrack || (songRevealTrack.status !== 'PENDING' && songRevealTrack.audioUrl)) return;
        
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 30) {
                clearInterval(interval); // Give up after ~2.5 minutes
                return;
            }
            try {
                const uid = auth.user?.uid;
                if (!uid) return;
                const res = await fetch(`/api/music/latest?userId=${uid}${generatedPlanId ? `&planId=${generatedPlanId}` : ''}`);
                if (res.ok) {
                    const { track } = await res.json();
                    if (track && track.id === songRevealTrack.id && (track.status !== 'PENDING' || track.audioUrl)) {
                        console.log('[PrivateSatsang] Song finished generating! Updating UI.');
                        setSongRevealTrack(track);
                        clearInterval(interval);
                    }
                }
            } catch (e) {
                console.warn('[PrivateSatsang] Polling error:', e);
            }
        }, 5000); // Check every 5 seconds
        
        return () => clearInterval(interval);
    }, [songRevealVisible, songRevealTrack, auth.user?.uid]);

    // Fetch Prasad Summary
    useEffect(() => {
        if (!songRevealVisible || !lastRoomName || prasadText) return;

        let attempts = 0;
        let pollingInterval: any = null;

        const fetchPrasad = async () => {
            try {
                attempts++;
                if (attempts > 15) {
                    clearInterval(pollingInterval);
                    return;
                }
                const res = await fetch(`/api/satsang/summary?roomName=${lastRoomName}&guruId=${guruId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.summary) {
                        setPrasadText(data.summary);
                        clearInterval(pollingInterval);
                    } else if (!data.pending) {
                        clearInterval(pollingInterval);
                    }
                }
            } catch (e) { }
        };

        pollingInterval = setInterval(fetchPrasad, 4000);
        fetchPrasad();

        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [songRevealVisible, lastRoomName, guruId, prasadText]);

    // Handle topic submission -> Triggers Generation or Reuse
    const handleTopicSubmit = async (selectedTopic: string, existingPlanId?: string) => {
        setTopic(selectedTopic);
        setIsTopicSelected(true);
        if (existingPlanId) {
            await fetchExistingPlan(existingPlanId);
        } else {
            await generatePlan(selectedTopic);
        }
    };

    // New function to fetch existing plan details
    const fetchExistingPlan = async (planId: string) => {
        try {
            setIsGenerating(true);
            const res = await fetch(`/api/satsang/plan?planId=${planId}`);
            if (!res.ok) throw new Error('Failed to fetch plan');
            const { plan } = await res.json();
            setGeneratedPlanId(planId);
            setSatsangPlan(plan);
            setTopic(plan.topic);
            setIsPlanReady(true);
        } catch (error) {
            console.error('Error fetching existing plan:', error);
            setIsTopicSelected(false);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSurpriseMe = () => {
        const topicsHi = [
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
        const topicsEn = [
            'Who am I? The journey of self-exploration',
            'The secret of Karma and Destiny: Is everything predetermined?',
            'What is Moksha and how to attain it in this life?',
            'How is it possible to attain God while living a worldly life?',
            'The root cause of sorrow and the path to permanent joy',
            'What is the journey of the soul after death?',
            'The essence of Vedanta: "Tat Tvam Asi" (You are That)',
            'How to control the mind and find inner peace?',
            'Bhakti Yoga vs Jnana Yoga: What is right for me?'
        ];
        const topics = language === 'hi' ? topicsHi : topicsEn;
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
                    userId,
                    language
                }),
            });

            if (!genRes.ok) throw new Error('Failed to generate session plan');

            const { planId, plan } = await genRes.json();
            console.log('Generated Plan ID:', planId);

            setGeneratedPlanId(planId);
            setSatsangPlan(plan);
            setTopic(plan.topic);
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
                    userId,
                    role: 'host',
                    planId: generatedPlanId,
                    language
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

            // Listen for agent-triggered disconnect → show song reveal
            newRoom.on(RoomEvent.Disconnected, async () => {
                console.log('[PrivateSatsang] Room disconnected — stopping recording & fetching satsang song...');
                
                // Wait 4 seconds before explicitly stopping egress so the final buffers are flushed properly
                const ids = [...egressIdsRef.current];
                const currentRoomName = targetRoomName;
                if (ids.length > 0) {
                    egressIdsRef.current = []; // Clear to prevent double-stop
                    setTimeout(() => {
                        fetch('/api/egress/stop', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ roomName: currentRoomName, egressIds: ids }),
                        }).catch(e => console.warn('[PrivateSatsang] stop egress on disconnect error', e));
                    }, 4000);
                }
                
                try {
                    const uid = auth.user?.uid;
                    if (uid && generatedPlanId) {
                        // Always show the song reveal screen even if PENDING (loading state)
                        const res = await fetch(`/api/music/latest?userId=${uid}&planId=${generatedPlanId}`);
                        if (res.ok) {
                            const { track } = await res.json();
                            if (track) {
                                setSongRevealTrack(track);
                                setSongRevealVisible(true);
                                return; // Don't navigate — let the reveal screen handle it
                            }
                        }
                        // No track found yet — still show reveal with PENDING placeholder
                        setSongRevealTrack({ title: 'Satsang Meditation', status: 'PENDING' });
                        setSongRevealVisible(true);
                        return;
                    } else if (uid) {
                        // Fallback: no planId, try by userId
                        const res = await fetch(`/api/music/latest?userId=${uid}`);
                        if (res.ok) {
                            const { track } = await res.json();
                            if (track) {
                                setSongRevealTrack(track);
                                setSongRevealVisible(true);
                                return;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[PrivateSatsang] Could not fetch satsang song:', e);
                }
                // Final fallback: navigate normally
                router.push(`/hinduism/${guruId}`);
            });

            setRoom(newRoom);
            setLastRoomName(data.roomName || newRoom.name);

            await newRoom.connect(data.serverUrl, data.participantToken);
            setIsConnected(true);
            console.log('Connected to private satsang room:', newRoom.name);

            // Mark session start time for coin deduction
            sessionStartTimeRef.current = Date.now();

            // Start Session Recording immediately
            const targetRoomName = newRoom.name;
            const startEgress = async (retries = 3) => {
                try {
                    const res = await fetch('/api/egress/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomName: targetRoomName,
                            userId: auth.user?.uid || 'anonymous_guest',
                            guruId: guruId,
                            intention: 'private_satsang'
                        }),
                    });
                    const data = await res.json();

                    if (res.ok && data?.egressId) {
                        egressIdsRef.current.push(String(data.egressId));
                        console.log('[PrivateSatsang] Recording started:', data);
                    } else {
                        console.warn('[PrivateSatsang] Recording API returned partial/error:', data);
                    }
                } catch (e) {
                    console.error('[PrivateSatsang] Egress start failed:', e);
                    if (retries > 0) setTimeout(() => startEgress(retries - 1), 2000);
                }
            };
            startEgress();

        } catch (error) {
            console.error('Error connecting to room:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const ids = [...egressIdsRef.current];
            const currentRoomName = room?.name;
            if (room && room.state !== 'disconnected') {
                room.disconnect();
            }
            if (ids.length > 0 && currentRoomName) {
                fetch('/api/egress/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomName: currentRoomName, egressIds: ids }),
                }).catch(e => console.warn('[PrivateSatsang] stop egress error', e));
                egressIdsRef.current = [];
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

        const currentRoomName = room?.name;
        if (room && room.state !== 'disconnected') {
            room.disconnect();
        }
        
        const ids = [...egressIdsRef.current];
        egressIdsRef.current = [];
        if (ids.length > 0 && currentRoomName) {
            fetch('/api/egress/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: currentRoomName, egressIds: ids }),
            }).catch(e => console.warn('[PrivateSatsang] stop egress error', e));
        }

        setRoom(null);
        setIsConnected(false);
        // Don't navigate — the RoomEvent.Disconnected listener will handle it
        // (or song reveal will show up automatically)
    };

    // Song Reveal — close and navigate to portal
    const handleSongRevealClose = () => {
        if (songRevealAudioRef.current) {
            songRevealAudioRef.current.pause();
        }
        setSongRevealVisible(false);
        router.push(`/hinduism/${guruId}`);
    };

    // Poll for song completion if it's currently PENDING
    useEffect(() => {
        if (!songRevealVisible || !songRevealTrack || (songRevealTrack.status !== 'PENDING' && songRevealTrack.audioUrl)) {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const uid = auth.user?.uid;
                if (!uid) return;
                
                const url = generatedPlanId 
                    ? `/api/music/latest?userId=${uid}&planId=${generatedPlanId}`
                    : `/api/music/latest?userId=${uid}`;
                    
                const res = await fetch(url);
                if (res.ok) {
                    const { track } = await res.json();
                    if (track && (track.audioUrl || track.status !== 'PENDING')) {
                        console.log('[PrivateSatsang] Song finished generating! Updating track.');
                        setSongRevealTrack(track);
                    }
                }
            } catch (e) {
                console.warn('[PrivateSatsang] Error polling for song completion:', e);
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(pollInterval);
    }, [songRevealVisible, songRevealTrack, auth.user?.uid, generatedPlanId]);

    if (!isTopicSelected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 relative overflow-hidden font-sans">
                {/* Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70 transform scale-105"
                    style={{ backgroundImage: `url('${guruImage || `/images/gurus/${guruId}.jpg`}'), url('/images/placeholder-guru.jpg')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                {/* Back Button */}
                <Link
                    href={`/${traditionSlug}/${guruId}`}
                    className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('privateSatsang.backBtn')}</span>
                </Link>

                <div className="relative z-10 w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="space-y-2">
                        <p className="text-orange-400 font-medium tracking-widest text-xs uppercase">{t('privateSatsang.sessionLabel')}</p>
                        <h1 className="text-3xl md:text-4xl font-serif font-light text-orange-50">
                            {guruName}
                        </h1>
                    </div>

                    <p className="text-gray-300 text-lg font-light leading-relaxed">
                        {t('privateSatsang.topicPrompt')}
                    </p>

                    <div className="space-y-4 pt-4">
                        <input
                            type="text"
                            placeholder={t('privateSatsang.topicPlaceholder')}
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
                            {t('privateSatsang.startBtn')}
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
                            <span>✨</span> {t('privateSatsang.suggestTopic')}
                        </button>

                        {isFetchingTopics ? (
                            <div className="pt-2 animate-pulse">
                                <p className="text-xs text-center text-orange-300/60 mb-3 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin"></span>
                                    Divining Topics...
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-8 w-24 bg-white/10 rounded-full"></div>
                                    ))}
                                </div>
                            </div>
                        ) : recentTopics.length > 0 && (
                            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
                                <p className="text-xs text-center text-orange-200/60 mb-3 uppercase tracking-widest flex justify-center gap-2 items-center">
                                    <span>✨</span> {t('privateSatsang.smartTopics') || 'Smart AI Topics'} <span>✨</span>
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {recentTopics.map((tObj, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleTopicSubmit(tObj.topic, tObj.planId)}
                                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 text-xs text-gray-300 hover:text-orange-200 transition-all cursor-pointer whitespace-nowrap whitespace-normal max-w-full truncate"
                                            title={tObj.topic}
                                        >
                                            {tObj.topic.length > 40 ? tObj.topic.substring(0, 40) + '...' : tObj.topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Past Recordings container positioned below the card */}
                <div className="relative z-10 w-full max-w-md mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <GuruPastRecordings guruId={guruId} type="private" />
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

                {/* Back Button */}
                <Link
                    href={`/${traditionSlug}/${guruId}`}
                    className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('privateSatsang.backBtn')}</span>
                </Link>

                <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 space-y-6 animate-in fade-in zoom-in duration-300">

                    {isPlanReady ? (
                        // Session Ready State
                        <>
                            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-2 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                                <span className="text-3xl">🕉️</span>
                            </div>

                            <h2 className="text-2xl font-serif text-orange-50">{t('privateSatsang.satsangReady')}</h2>
                            <p className="text-gray-300 text-center font-light">
                                {t('privateSatsang.preparedOn')} <br />
                                <span className="text-orange-300 font-medium">&quot;{topic}&quot;</span><br />
                                {t('privateSatsang.hasBeen')}
                            </p>

                            <button
                                onClick={handleEnterSatsang}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-semibold text-white shadow-xl shadow-orange-900/40 hover:from-orange-500 hover:to-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>{t('privateSatsang.enterSession')}</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </button>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                {t('privateSatsang.guruWaiting')}
                            </p>
                        </>
                    ) : (
                        // Generating State
                        <>
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                            <p className="text-lg font-light tracking-wide text-center">
                                {isGenerating
                                    ? `${t('privateSatsang.preparing')} "${topic}"...`
                                    : t('privateSatsang.connecting')}
                            </p>
                            {isGenerating && (
                                <p className="text-sm text-gray-400 mt-2 text-center">{t('privateSatsang.creating')}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Song reveal overlay (shown after agent ends Q&A)
    if (songRevealVisible && songRevealTrack) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white overflow-hidden">
                {/* Background pulse */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-black to-orange-950 opacity-80" />
                <div className="absolute inset-0">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-orange-500/10 animate-ping"
                            style={{
                                width: `${100 + i * 60}px`,
                                height: `${100 + i * 60}px`,
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                animationDelay: `${i * 0.4}s`,
                                animationDuration: '3s',
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 gap-6 text-center animate-in fade-in zoom-in duration-700">
                    {/* Album art */}
                    {songRevealTrack.imageUrl ? (
                        <img
                            src={songRevealTrack.imageUrl}
                            alt={songRevealTrack.title}
                            className="w-48 h-48 rounded-2xl object-cover shadow-2xl shadow-orange-900/50 border border-white/10"
                        />
                    ) : (
                        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-orange-500/30 to-violet-600/30 flex items-center justify-center border border-white/10 shadow-2xl">
                            <Music2 className="w-20 h-20 text-orange-400/70" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-orange-400 text-xs uppercase tracking-widest font-medium">{t('privateSatsang.songTitle')}</p>
                        <h2 className="text-2xl font-serif text-white">{songRevealTrack.title}</h2>
                        <p className="text-gray-400 text-sm font-light leading-relaxed">
                            {t('privateSatsang.songDesc')} <span className="text-orange-300">&quot;{topic}&quot;</span> {t('privateSatsang.songDesc2')}
                        </p>
                    </div>

                    {/* Audio player OR Loading indicator */}
                    {(songRevealTrack.audioUrl && songRevealTrack.status !== 'PENDING') ? (
                        <audio
                            ref={songRevealAudioRef}
                            src={`/api/music-proxy?url=${encodeURIComponent(songRevealTrack.audioUrl)}`}
                            controls
                            autoPlay
                            className="w-full rounded-xl"
                        />
                    ) : (
                        <div className="w-full py-6 flex flex-col items-center justify-center space-y-4 bg-white/5 rounded-2xl border border-white/10">
                            <div className="relative flex items-center justify-center w-12 h-12">
                                <div className="absolute w-12 h-12 rounded-full border-t-2 border-orange-500 animate-spin" />
                                <Music2 className="w-5 h-5 text-orange-400 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-orange-200 text-sm font-medium animate-pulse">
                                    The Guru is meditating over your blessing...
                                </p>
                                <p className="text-orange-400/60 text-xs">
                                    Materializing your custom song (up to 2 mins)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Prasad Section */}
                    {prasadText ? (
                        <div className="w-full relative mt-2 bg-gradient-to-br from-orange-500/10 to-transparent p-[1px] rounded-2xl">
                            <div className="bg-black/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-2xl">
                                <p className="text-orange-400 text-xs uppercase tracking-widest font-medium mb-3">✨ Spiritual Prasad</p>
                                <p className="text-white/90 text-[15px] font-serif leading-relaxed italic">
                                    &quot;{prasadText}&quot;
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center py-2 animate-pulse">
                            <div className="h-1 w-12 bg-white/10 rounded-full" />
                        </div>
                    )}

                    <button
                        onClick={handleSongRevealClose}
                        className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-all text-sm mt-4"
                    >
                        {t('privateSatsang.returnPortal')}
                    </button>
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
                guruImage={guruImage}
                durations={{ intro: 120, meditation: 300, pravachan: 7200, qa: 900 }}
                onLeave={handleLeave}
                initialTopic={topic}
                meditationAudioUrl={meditationAudioUrl}
                meditationTitle={meditationTitle}
                meditationImageUrl={meditationImageUrl}
                onPhaseChange={(phase) => {
                    if (phase === 'meditation') {
                        console.log('[PrivateSatsang] Meditation phase started. Stopping recording.');
                        const ids = [...egressIdsRef.current];
                        const currentRoomName = room?.name;
                        if (ids.length > 0 && currentRoomName) {
                            fetch('/api/egress/stop', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ roomName: currentRoomName, egressIds: ids }),
                            }).catch(e => console.warn('[PrivateSatsang] stop egress error', e));
                            egressIdsRef.current = [];
                        }
                    }
                }}
            />

            {/* Toaster for notifications */}
            <Toaster />
        </RoomContext.Provider>
    );
}
