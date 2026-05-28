'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { Plus, X } from 'lucide-react';
import { usePlaylists } from '@/hooks/use-playlists';

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
    const { createPlaylist } = usePlaylists();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        const success = await createPlaylist(name, description);
        setLoading(false);

        if (success) {
            setName('');
            setDescription('');
            if (onCreated) onCreated();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-serif text-white mb-6">Create New Playlist</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500/50"
                            placeholder="e.g. Meditation Mix"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500/50 min-h-[80px]"
                            placeholder="What's the vibe?"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading || !name.trim()}>
                            {loading ? 'Creating...' : 'Create Playlist'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
