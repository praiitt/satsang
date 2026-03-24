'use client';

import { useState, useEffect } from 'react';
import { getUserRecordings, type Recording } from '@/lib/auth-api';
import { useAuth } from '@/components/auth/auth-provider';
import { Play, Calendar, Clock, Music } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/livekit/button';

interface GuruPastRecordingsProps {
    guruId: string;
    type: 'private' | 'chat'; 
}

export function GuruPastRecordings({ guruId, type }: GuruPastRecordingsProps) {
    const { user } = useAuth();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        getUserRecordings(user.uid)
            .then(allRecordings => {
                // Filter specifically for this Guru and Session Type
                const filtered = allRecordings.filter(rec => {
                    // 1. Determine if it's Private or Chat
                    const recIntention = rec.intention || '';
                    const roomName = rec.roomName || '';
                    const recId = rec.id || '';
                    const recGuruId = rec.guruId || '';
                    
                    const isPrivate = 
                        recIntention === 'private_satsang' || 
                        roomName.toLowerCase().startsWith('satsang_') ||
                        recId.toLowerCase().includes('satsang_');
                    
                    // Match the requested type (private vs chat)
                    if (type === 'private' && !isPrivate) return false;
                    if (type === 'chat' && isPrivate) return false;

                    // 2. Match Guru
                    // Check explicit metadata field first
                    if (recGuruId && recGuruId.toLowerCase() === guruId.toLowerCase()) return true;
                    
                    // Fallback: Parse the roomName or recId for the guru slug
                    // We look for the guruId surrounded by underscores or at the start/end of segments
                    const normalizedGuruId = guruId.toLowerCase();
                    const normalizedRoomName = roomName.toLowerCase();
                    const normalizedRecId = recId.toLowerCase();

                    const matchesGuruNameInRoom = 
                        normalizedRoomName.includes(`_${normalizedGuruId}_`) || 
                        normalizedRoomName.includes(`_${normalizedGuruId}`) ||
                        normalizedRoomName.includes(`${normalizedGuruId}_`) ||
                        // Handle cases like "voice_assistant_room-shiva-123"
                        normalizedRoomName.includes(`-${normalizedGuruId}-`) ||
                        // Last resort: simple inclusion if it's a specific-enough string
                        (normalizedRoomName.includes(normalizedGuruId) && 
                         (normalizedRoomName.startsWith('satsang_') || normalizedRoomName.startsWith('voice_assistant_')));

                    if (matchesGuruNameInRoom) return true;
                    
                    // Final fallback: check the unique recording ID string
                    if (normalizedRecId.includes(normalizedGuruId)) return true;

                    return false;
                });
                
                setRecordings(filtered);
            })
            .catch(console.error)
            .finally(() => setLoading(false));

    }, [user?.uid, guruId, type]);

    if (loading) {
        return <div className="animate-pulse text-white/50 text-sm">Loading past recordings...</div>;
    }

    if (recordings.length === 0) {
        return null; // Don't show the section if no past sessions exist
    }

    return (
        <div className="w-full mt-6 flex flex-col gap-3">
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                {type === 'private' ? 'Past Private Satsangs' : 'Past Conversations'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
                {recordings.map(rec => {
                    const date = rec.createdAt ? new Date(
                        typeof rec.createdAt === 'string' ? rec.createdAt :
                            (rec.createdAt._seconds * 1000)
                    ) : new Date();

                    const durationSeconds = Math.round(rec.duration ? rec.duration / 1000000000 : 0);
                    const durationFormatted = durationSeconds > 0
                        ? `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}`
                        : 'Session';

                    const isPlaying = playingUrl === rec.publicUrl;

                    return (
                        <div key={rec.id} className="bg-black/40 border border-white/10 rounded-xl p-4 hover:bg-white/5 transition-all flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm text-white/90 font-medium">
                                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                                        {format(date, 'MMM d, yyyy')}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                        <Clock className="h-3 w-3" />
                                        {durationFormatted}
                                    </div>
                                </div>
                                {rec.publicUrl && (
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className={`rounded-full shadow-lg ${isPlaying ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                                        onClick={() => setPlayingUrl(isPlaying ? null : rec.publicUrl!)}
                                    >
                                        {isPlaying ? <Music className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                            {isPlaying && rec.publicUrl && (
                                <div className="mt-2 animate-in fade-in duration-300">
                                    <audio src={rec.publicUrl} controls autoPlay className="w-full h-8 opacity-80 filter brightness-150 rounded" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
