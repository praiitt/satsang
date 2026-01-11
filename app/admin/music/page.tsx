'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MusicTrack {
    id: string;
    title: string;
    userId: string;
    audioUrl: string;
    imageUrl?: string;
    createdAt: any;
    metadata?: {
        tags?: string;
        description?: string;
    };
    uploads?: {
        youtube?: {
            status: 'uploading' | 'completed' | 'failed';
            videoId?: string;
            url?: string;
        };
        soundcloud?: {
            status: 'uploading' | 'completed' | 'failed';
            trackId?: string;
            url?: string;
        };
    };
}

interface Platform {
    platform: string;
    connected: boolean;
    channelTitle?: string;
    username?: string;
}

export default function AdminMusicPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        title: '',
        audioFile: null as File | null,
        imageFile: null as File | null,
        description: '',
        tags: ''
    });

    // Admin check (simplified - in production, check admin claim)
    const isAdmin = user?.email?.includes('@satsang') || user?.uid === 'admin-uid';

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
        if (user && !isAdmin) {
            router.push('/');
        }
        if (user && isAdmin) {
            fetchTracks();
            fetchPlatforms();
        }
    }, [user, authLoading, isAdmin]);

    async function fetchTracks() {
        try {
            const res = await fetch(`/api/admin/music/tracks?page=${page}&limit=20`);
            const data = await res.json();
            setTracks(data.tracks || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching tracks:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchPlatforms() {
        try {
            const res = await fetch('/api/user/platforms');
            const data = await res.json();
            setPlatforms(data.platforms || []);
        } catch (error) {
            console.error('Error fetching platforms:', error);
        }
    }

    async function handleManualUpload(e: React.FormEvent) {
        e.preventDefault();

        if (!uploadForm.audioFile || !uploadForm.title) {
            alert('Please provide at least a title and audio file');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('title', uploadForm.title);
            formData.append('audioFile', uploadForm.audioFile);
            if (uploadForm.imageFile) formData.append('imageFile', uploadForm.imageFile);
            formData.append('description', uploadForm.description);
            formData.append('tags', uploadForm.tags);

            const res = await fetch('/api/admin/music/upload-file', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                alert('Track uploaded successfully!');
                setUploadForm({
                    title: '',
                    audioFile: null,
                    imageFile: null,
                    description: '',
                    tags: ''
                });
                // Reset file inputs
                const fileInputs = document.querySelectorAll('input[type="file"]');
                fileInputs.forEach((input: any) => input.value = '');
                await fetchTracks();
            } else {
                alert(`Upload failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            setUploading(false);
        }
    }

    async function handleDeleteTrack(trackId: string, trackTitle: string) {
        if (!confirm(`Are you sure you want to delete "${trackTitle}"? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/music/tracks/${trackId}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                alert('Track deleted successfully');
                await fetchTracks();
            } else {
                alert(`Delete failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting track:', error);
            alert('Error deleting track');
        }
    }

    async function handleConnectPlatform(platform: 'youtube' | 'soundcloud') {
        try {
            const res = await fetch(`/api/user/platforms/${platform}/connect`, { method: 'POST' });
            const data = await res.json();

            if (data.authUrl) {
                window.open(data.authUrl, '_blank', 'width=600,height=700');
                // Poll for connection status
                const interval = setInterval(async () => {
                    await fetchPlatforms();
                    const connected = platforms.find(p => p.platform === platform)?.connected;
                    if (connected) {
                        clearInterval(interval);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error(`Error connecting ${platform}:`, error);
        }
    }

    async function handleUpload(trackId: string, platform: 'youtube' | 'soundcloud') {
        try {
            setTracks(prev => prev.map(t => t.id === trackId ? {
                ...t,
                uploads: {
                    ...t.uploads,
                    [platform]: { status: 'uploading' }
                }
            } : t));

            const res = await fetch(`/api/admin/music/upload/${platform}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackId })
            });

            const data = await res.json();

            if (data.success) {
                await fetchTracks(); // Refresh to get updated status
            } else {
                alert(`Upload failed: ${data.error}`);
            }
        } catch (error) {
            console.error(`Error uploading to ${platform}:`, error);
            alert(`Error uploading to ${platform}`);
        }
    }

    const youtubePlatform = platforms.find(p => p.platform === 'youtube');
    const soundcloudPlatform = platforms.find(p => p.platform === 'soundcloud');

    if (authLoading || loading) {
        return <div className="p-8">Loading...</div>;
    }

    if (!isAdmin) {
        return <div className="p-8">Access Denied</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold mb-8">Music Management</h1>

            {/* Manual Upload Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Upload Music File</h2>
                <form onSubmit={handleManualUpload} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title *</label>
                            <input
                                type="text"
                                value={uploadForm.title}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-3 py-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                            <input
                                type="text"
                                value={uploadForm.tags}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                                placeholder="meditation, healing, rraasi"
                                className="w-full px-3 py-2 border rounded"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                            rows={3}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Audio File * (MP3, WAV)</label>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => setUploadForm(prev => ({ ...prev, audioFile: e.target.files?.[0] || null }))}
                                className="w-full px-3 py-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Cover Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setUploadForm(prev => ({ ...prev, imageFile: e.target.files?.[0] || null }))}
                                className="w-full px-3 py-2 border rounded"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                        {uploading ? 'Uploading...' : 'Upload Track'}
                    </button>
                </form>
            </div>

            {/* Platform Connections */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Platform Connections</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {/* YouTube */}
                    <div className="border rounded p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">YouTube</h3>
                                {youtubePlatform?.connected ? (
                                    <p className="text-sm text-green-600">✓ Connected: {youtubePlatform.channelTitle}</p>
                                ) : (
                                    <p className="text-sm text-gray-500">Not connected</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleConnectPlatform('youtube')}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                disabled={youtubePlatform?.connected}
                            >
                                {youtubePlatform?.connected ? 'Connected' : 'Connect'}
                            </button>
                        </div>
                    </div>

                    {/* SoundCloud */}
                    <div className="border rounded p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">SoundCloud</h3>
                                {soundcloudPlatform?.connected ? (
                                    <p className="text-sm text-green-600">✓ Connected: @{soundcloudPlatform.username}</p>
                                ) : (
                                    <p className="text-sm text-gray-500">Not connected</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleConnectPlatform('soundcloud')}
                                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                                disabled={soundcloudPlatform?.connected}
                            >
                                {soundcloudPlatform?.connected ? 'Connected' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tracks Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left">Title</th>
                            <th className="px-4 py-3 text-left">Created</th>
                            <th className="px-4 py-3 text-left">YouTube</th>
                            <th className="px-4 py-3 text-left">SoundCloud</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tracks.map((track) => (
                            <tr key={track.id} className="border-t">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{track.title}</div>
                                    <div className="text-sm text-gray-500">{track.userId}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {track.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                    {track.uploads?.youtube?.status === 'completed' ? (
                                        <a href={track.uploads.youtube.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            View
                                        </a>
                                    ) : track.uploads?.youtube?.status === 'uploading' ? (
                                        <span className="text-yellow-600">Uploading...</span>
                                    ) : (
                                        <button
                                            onClick={() => handleUpload(track.id, 'youtube')}
                                            disabled={!youtubePlatform?.connected}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                        >
                                            Upload
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {track.uploads?.soundcloud?.status === 'completed' ? (
                                        <a href={track.uploads.soundcloud.url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                                            View
                                        </a>
                                    ) : track.uploads?.soundcloud?.status === 'uploading' ? (
                                        <span className="text-yellow-600">Uploading...</span>
                                    ) : (
                                        <button
                                            onClick={() => handleUpload(track.id, 'soundcloud')}
                                            disabled={!soundcloudPlatform?.connected}
                                            className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300"
                                        >
                                            Upload
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleDeleteTrack(track.id, track.title)}
                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {tracks.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No tracks found</div>
                )}

                {/* Pagination */}
                {total > 20 && (
                    <div className="p-4 border-t flex justify-between items-center">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span>Page {page} of {Math.ceil(total / 20)}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= Math.ceil(total / 20)}
                            className="px-4 py-2 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
