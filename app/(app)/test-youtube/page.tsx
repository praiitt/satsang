'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';

export default function TestYouTubePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      videoId: string;
      title: string;
      description: string;
      thumbnail?: string;
      channelTitle: string;
      publishedAt: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail?: string;
  } | null>(null);
  const [videoIdInput, setVideoIdInput] = useState('');
  const { isReady, error, playVideo, pause, resume, isPlaying, currentVideoId } =
    useYouTubePlayer();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(searchQuery)}&maxResults=10`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.videos || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Search failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayVideo = async (videoId: string) => {
    try {
      await playVideo(videoId, 0);
      const video = searchResults.find((v) => v.videoId === videoId);
      if (video) setSelectedVideo(video);
    } catch (error) {
      console.error('Play error:', error);
      alert('Failed to play video');
    }
  };

  const handlePlayFromInput = async () => {
    if (!videoIdInput.trim()) return;
    // Extract video ID from URL if needed
    let videoId = videoIdInput.trim();
    const match = videoId.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    if (match) {
      videoId = match[1];
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      alert('Invalid YouTube video ID or URL');
      return;
    }
    await handlePlayVideo(videoId);
  };

  return (
    <div className="bg-background min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-foreground mb-6 text-3xl font-bold">YouTube Player Test</h1>

        {/* Player Status */}
        <div className="bg-card border-border mb-6 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 text-xl font-semibold">Player Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={isReady ? 'text-green-600' : 'text-yellow-600'}>
                {isReady ? '✅ Ready' : '⏳ Loading...'}
              </span>
            </div>
            {error && (
              <div className="text-destructive">
                <span className="text-muted-foreground">Error:</span> {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Playing:</span>
              <span className={isPlaying ? 'text-green-600' : 'text-gray-600'}>
                {isPlaying ? '▶️ Yes' : '⏸️ No'}
              </span>
            </div>
            {currentVideoId && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current Video ID:</span>
                <span className="font-mono text-xs">{currentVideoId}</span>
              </div>
            )}
            {selectedVideo && (
              <div className="bg-background mt-3 rounded-lg p-3">
                <div className="font-semibold">{selectedVideo.title}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {selectedVideo.channelTitle}
                </div>
                {selectedVideo.thumbnail && (
                  <img
                    src={selectedVideo.thumbnail}
                    alt={selectedVideo.title}
                    className="mt-2 h-32 w-full rounded object-cover"
                  />
                )}
              </div>
            )}
            {currentVideoId && (
              <div className="mt-3">
                <div className="text-muted-foreground mb-2 text-xs">
                  YouTube Player is running in the background. Audio should be playing now.
                </div>
                {isPlaying ? (
                  <div className="text-sm font-semibold text-green-600">▶️ Audio is playing</div>
                ) : (
                  <div className="text-sm text-yellow-600">
                    ⏸️ Paused (click Resume or interact with page to start)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Direct Video ID Input */}
        <div className="bg-card border-border mb-6 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 text-xl font-semibold">Play by Video ID or URL</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoIdInput}
              onChange={(e) => setVideoIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePlayFromInput();
              }}
              placeholder="YouTube Video ID or URL (e.g., dQw4w9WgXcQ or https://youtube.com/watch?v=dQw4w9WgXcQ)"
              className="border-input bg-background text-foreground flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <Button onClick={handlePlayFromInput} disabled={!isReady || !videoIdInput.trim()}>
              Play
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-card border-border mb-6 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 text-xl font-semibold">Search YouTube Videos</h2>
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) handleSearch();
              }}
              placeholder="Search for bhajans or videos..."
              className="border-input bg-background text-foreground flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-foreground text-sm font-semibold">
                Results ({searchResults.length})
              </h3>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {searchResults.map((video) => (
                  <div
                    key={video.videoId}
                    className="bg-background hover:bg-background/80 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  >
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-20 w-32 flex-shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-semibold">{video.title}</div>
                      <div className="text-muted-foreground mt-1 text-xs">{video.channelTitle}</div>
                      <div className="text-muted-foreground mt-1 font-mono text-xs">
                        ID: {video.videoId}
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePlayVideo(video.videoId)}
                      disabled={!isReady}
                      size="sm"
                      variant={currentVideoId === video.videoId ? 'primary' : 'outline'}
                    >
                      {currentVideoId === video.videoId && isPlaying ? 'Playing' : 'Play'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-card border-border rounded-lg border p-4">
          <h2 className="text-foreground mb-3 text-xl font-semibold">Player Controls</h2>
          <div className="flex gap-2">
            <Button onClick={resume} disabled={!isReady || isPlaying}>
              ▶️ Resume
            </Button>
            <Button onClick={pause} disabled={!isReady || !isPlaying}>
              ⏸️ Pause
            </Button>
            <Button
              onClick={() => {
                setSelectedVideo(null);
                setSearchResults([]);
                setSearchQuery('');
                setVideoIdInput('');
              }}
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 border-border mt-6 rounded-lg border p-4">
          <h3 className="text-foreground mb-2 font-semibold">Test Instructions</h3>
          <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
            <li>Wait for the player status to show &quot;✅ Ready&quot;</li>
            <li>
              Search for a video (e.g., &quot;bhajan&quot; or &quot;devotional songs&quot;) or enter
              a video ID directly
            </li>
            <li>Click &quot;Play&quot; on a video to test playback</li>
            <li>
              <strong>Important:</strong> Due to browser autoplay policies, you may need to click
              anywhere on the page first, then click Play. Audio should start playing.
            </li>
            <li>Use Pause/Resume buttons to control playback</li>
            <li>Check browser console for any errors or logs</li>
          </ol>
          <div className="mt-3 rounded border border-yellow-300 bg-yellow-100 p-2 text-xs text-yellow-800">
            <strong>Note:</strong> The YouTube player runs in the background (hidden). You should
            hear audio when a video is playing. If autoplay is blocked, interact with the page
            (click anywhere) and then click Play again.
          </div>
        </div>
      </div>
    </div>
  );
}
