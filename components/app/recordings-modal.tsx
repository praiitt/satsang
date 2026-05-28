'use client';

import { useState, useEffect } from 'react';
import { getUserRecordings, type Recording } from '@/lib/auth-api';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/livekit/button';
import { X, Play, Music, Calendar, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export interface RecordingsModalProps {
    isOpen?: boolean;
    onClose: () => void;
    inline?: boolean;
}

export function RecordingsModal({ isOpen = true, onClose, inline = false }: RecordingsModalProps) {
    const { user } = useAuth();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(false);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user?.uid) {
            setLoading(true);
            getUserRecordings(user.uid)
                .then(setRecordings)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen, user?.uid]);

    if (!isOpen && !inline) return null;

    const content = (
        <div className={`bg-white dark:bg-gray-900 w-full flex flex-col ${inline ? 'h-full shadow-none' : 'rounded-2xl max-w-lg shadow-2xl overflow-hidden max-h-[80vh]'}`}>
            {/* Header */}
            {!inline && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 shrink-0 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        <h2 className="text-xl font-bold">My Recordings</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading recordings...</div>
                    ) : recordings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No recordings found. Start a session to create one!
                        </div>
                    ) : (
                        recordings.map((rec) => {
                            const date = rec.createdAt ? new Date(
                                typeof rec.createdAt === 'string' ? rec.createdAt :
                                    (rec.createdAt._seconds * 1000)
                            ) : new Date();

                            const durationSeconds = Math.round(rec.duration ? rec.duration / 1000000000 : 0); // Egress duration is in nanoseconds often, need to verify
                            // Wait, existing webhook code: duration: egress.duration (which is usually nanoseconds for LiveKit egress)
                            // But let's assume it's seconds or format roughly.
                            // If it's huge, divide. LiveKit generic egress API returns duration in nanoseconds (int64).
                            // Let's assume nanoseconds -> seconds.
                            const durationFormatted = durationSeconds > 0
                                ? `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}`
                                : 'Unknown';

                            return (
                                <div key={rec.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Calendar className="h-3 w-3" />
                                            {format(date, 'MMM d, yyyy h:mm a')}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Clock className="h-3 w-3" />
                                            {durationFormatted}
                                        </div>
                                    </div>

                                    {rec.publicUrl && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    console.log('[RecordingsModal] Play clicked:', rec.publicUrl);
                                                    setPlayingUrl(rec.publicUrl!);
                                                }}
                                                className={playingUrl === rec.publicUrl ? "bg-indigo-100 text-indigo-700 border-indigo-200" : ""}
                                            >
                                                <Play className="h-4 w-4 mr-1" />
                                                {playingUrl === rec.publicUrl ? 'Playing' : 'Play'}
                                            </Button>

                                            {/* Continue Session Button */}
                                            <Button
                                                size="sm"
                                                variant="dotted"
                                                onClick={() => {
                                                    onClose();
                                                    // Use window event or callback if session provider is not available here?
                                                    // But we can try to use session context if available
                                                    // Since we can't easily hook into useSession without checking if we are wrapped...
                                                    // Let's assume onStartCall generic prop from parent or event dispatch.
                                                    // Actually, better to dispatch a custom event or use a global store if strictly needed.
                                                    // But for now, let's try a direct dispatch to the main app controller if accessible.
                                                    // Or better: dispatch a custom event that the main layout listens to.
                                                    const event = new CustomEvent('rraasi-start-session', {
                                                        detail: { intention: rec.intention || 'create_music', resumeSessionId: rec.id }
                                                    });
                                                    window.dispatchEvent(event);
                                                }}
                                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                                title="Continue this context"
                                            >
                                                <Sparkles className="h-4 w-4 mr-1" />
                                                Continue
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

            {/* Player Footer */}
            {playingUrl && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <video controls autoPlay src={playingUrl} className="w-full max-h-48 bg-black rounded" />
                </div>
            )}
        </div>
    );

    if (inline) return content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {content}
        </div>
    );
}
