'use client';

import { useState, useEffect } from 'react';
import { MoreVertical, Plus, Music, FileText, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaylists } from '@/hooks/use-playlists';
import { CreatePlaylistModal } from './create-playlist-modal';
import { Button } from '@/components/livekit/button';

interface AddToPlaylistMenuProps {
    trackId: string;
}

export function TrackActionsMenu({ trackId, trackTitle, trackDate, trackDuration, userName }: { trackId: string, trackTitle: string, trackDate?: string | Date, trackDuration?: number, userName?: string }) {
    const { playlists, fetchPlaylists, addTrackToPlaylist } = usePlaylists();
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const [isGeneratingLicense, setIsGeneratingLicense] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

    // Close menu when clicking outside (simple implementation)
    useEffect(() => {
        const handleClick = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        fetchPlaylists(); // Refresh list on open
        setIsOpen(!isOpen);
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        setAddingTo(playlistId);
        await addTrackToPlaylist(playlistId, trackId);
        await fetchPlaylists(); // Refresh to show updated count
        setAddingTo(null);
        setIsOpen(false);
    };

    const handleDownloadLicense = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsGeneratingLicense(true);
        try {
            const { generateLicensePdf } = await import('@/lib/license-generator');
            await generateLicensePdf({
                track: {
                    id: trackId,
                    title: trackTitle,
                    createdAt: trackDate || new Date(),
                    duration: trackDuration
                },
                user: {
                    name: userName || 'Rraasi User'
                }
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to generate license:", error);
        } finally {
            setIsGeneratingLicense(false);
        }
    };

    const handleCreateVideo = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isGeneratingVideo) return;

        setIsGeneratingVideo(true);
        try {
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                toast.error("Please login to create a video");
                return;
            }

            const response = await fetch(`/api/suno/generate-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ trackId })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success("Magic in progress! We're creating your video.", {
                    description: "This usually takes 1-2 minutes. We'll notify you when it's ready!"
                });
                setIsOpen(false);
                // Ideally refresh parent or status here, but optimistic UI in card handles "generating" if data refreshed
                // For now, let user know it started
            } else {
                if (response.status === 409) {
                    toast.info("Video is already being generated or exists!");
                } else {
                    throw new Error(result.error || "Failed to start generation");
                }
            }
        } catch (error: any) {
            console.error("Video generation error:", error);
            toast.error(error.message || "Failed to start video generation");
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggleMenu}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white transition-all hover:scale-110"
                title="Options"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 bottom-full mb-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Video Section */}
                    <div className="p-2 border-b border-white/5">
                        <button
                            onClick={handleCreateVideo}
                            disabled={isGeneratingVideo}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors group"
                        >
                            <Video className="w-4 h-4" />
                            <div className="flex flex-col items-start">
                                <span className="font-medium group-hover:text-purple-300">Create Music Video</span>
                                <span className="text-[10px] text-zinc-500 group-hover:text-purple-500/70">Convert MP3 to MP4</span>
                            </div>
                            {isGeneratingVideo && <Loader2 className="ml-auto w-3 h-3 text-purple-500 animate-spin" />}
                        </button>
                    </div>

                    {/* Playlist Section */}
                    <div className="p-2 border-b border-white/5 bg-zinc-900/50">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 px-3 py-1 block">Add to Playlist</span>
                    </div>

                    <div className="max-h-40 overflow-y-auto">
                        {playlists.length === 0 ? (
                            <div className="p-3 text-sm text-zinc-500 text-center">No playlists yet</div>
                        ) : (
                            playlists.map(playlist => (
                                <button
                                    key={playlist.id}
                                    onClick={() => handleAddToPlaylist(playlist.id)}
                                    disabled={addingTo === playlist.id}
                                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Music className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
                                        <span className="truncate">{playlist.name}</span>
                                    </div>
                                    {addingTo === playlist.id && <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-white/5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowCreateModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Playlist
                        </button>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <CreatePlaylistModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        fetchPlaylists(); // Refresh list after creation
                    }}
                />
            )}
        </div>
    );
}
