'use client';

import { useState } from 'react';
import { Room } from 'livekit-client';
import { Button } from '@/components/livekit/button';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';

// Mock Room for testing data channel messages
// const mockRoom: Room | null = null; // Not used currently

export default function TestYouTubeBindingPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { isReady, error, playVideo, pause, resume, isPlaying, currentVideoId } =
    useYouTubePlayer();

  const addResult = (message: string) => {
    setTestResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Simulate backend data channel message
  const simulateBackendMessage = (testData: {
    youtube_id?: string;
    youtube_url?: string;
    name: string;
    artist?: string;
    message?: string;
    spotify_id?: string;
    url?: string;
  }) => {
    try {
      // Create a mock data channel message (simulating LiveKit data channel)
      const message = JSON.stringify(testData);
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(message);

      // Simulate the YouTubeBhajanPlayer's data handler logic
      const text = new TextDecoder().decode(dataBytes);
      const parsed = JSON.parse(text);

      addResult(`📥 Received data: ${JSON.stringify(parsed, null, 2)}`);

      // Extract YouTube video ID (same logic as YouTubeBhajanPlayer)
      const extractYouTubeVideoId = (input: string | undefined): string | null => {
        if (!input) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
        const match = input.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
        );
        return match ? match[1] : null;
      };

      let youtubeId: string | undefined;
      let extractedVideoId: string | null = null;

      if (parsed.youtube_id) {
        youtubeId = parsed.youtube_id;
        addResult(`📺 Using youtube_id field: ${youtubeId}`);
        extractedVideoId = extractYouTubeVideoId(youtubeId);
      } else if (parsed.youtube_url) {
        youtubeId = parsed.youtube_url;
        addResult(`📺 Using youtube_url field: ${youtubeId}`);
        extractedVideoId = extractYouTubeVideoId(youtubeId);
      } else if (parsed.videoId) {
        youtubeId = parsed.videoId;
        addResult(`📺 Using videoId field: ${youtubeId}`);
        extractedVideoId = extractYouTubeVideoId(youtubeId);
      } else if (parsed.url) {
        addResult(`📺 Checking url field for YouTube: ${parsed.url}`);
        extractedVideoId = extractYouTubeVideoId(parsed.url);
        if (extractedVideoId) {
          youtubeId = parsed.url;
          addResult(`📺 Found YouTube ID in url field: ${extractedVideoId}`);
        }
      }

      if (!extractedVideoId) {
        addResult(`❌ No valid YouTube video ID found`);
        return;
      }

      if (!parsed.name) {
        addResult(`❌ Missing name field`);
        return;
      }

      addResult(`✅ Extracted video ID: ${extractedVideoId}`);
      addResult(`✅ Video name: ${parsed.name}`);
      if (parsed.artist) addResult(`✅ Artist: ${parsed.artist}`);
      if (parsed.message) addResult(`✅ Message: ${parsed.message}`);

      // Play the video
      addResult(`▶️  Starting playback of video: ${extractedVideoId}`);
      playVideo(extractedVideoId, 0)
        .then(() => {
          addResult(`✅ Video playback started successfully`);
        })
        .catch((err) => {
          addResult(`❌ Play error: ${err}`);
        });
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testCases = [
    {
      name: 'Test 1: Backend sends youtube_id',
      data: {
        youtube_id: 'Zdcth9NndEA',
        name: 'Hare Krishna Bhajan',
        artist: 'Spiritual Mantra',
        message: 'भजन चल रहा है। आनंद लें!',
      },
    },
    {
      name: 'Test 2: Backend sends youtube_url',
      data: {
        youtube_url: 'https://www.youtube.com/watch?v=GwqMDZ1-xZ8',
        name: 'Om Namah Shivaya',
        artist: 'Sangram Bhakti Dhara',
      },
    },
    {
      name: 'Test 3: Backend sends both youtube_id and youtube_url',
      data: {
        youtube_id: 'MFVqGF3KQmM',
        youtube_url: 'https://www.youtube.com/watch?v=MFVqGF3KQmM',
        name: 'Ram Bhajan',
        artist: 'Swastik Spiritual India',
        spotify_id: '4uLU6hMCyIA',
        url: 'https://p.scdn.co/mp3-preview/...',
        message: 'भजन चल रहा है।',
      },
    },
    {
      name: 'Test 4: Full backend format (all fields)',
      data: {
        url: 'https://p.scdn.co/mp3-preview/...',
        name: 'Krishna Bhajan',
        artist: 'Nova Spiritual India',
        spotify_id: '4uLU6hMCyIA',
        external_url: 'https://open.spotify.com/track/...',
        youtube_id: 'lE56rEKIwcE',
        youtube_url: 'https://www.youtube.com/watch?v=lE56rEKIwcE',
        message: "भजन 'Krishna Bhajan' चल रहा है। आनंद लें!",
      },
    },
    {
      name: 'Test 5: Only youtube_url (no youtube_id)',
      data: {
        youtube_url: 'https://youtu.be/56kL2etnfck',
        name: 'Devotional Song',
        artist: 'Devotional Time',
      },
    },
  ];

  return (
    <div className="bg-background min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-foreground mb-6 text-3xl font-bold">YouTube Data Binding Test</h1>

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
          </div>
        </div>

        {/* Test Cases */}
        <div className="bg-card border-border mb-6 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 text-xl font-semibold">Test Cases</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            These tests simulate backend LiveKit data channel messages to verify data binding.
          </p>
          <div className="space-y-3">
            {testCases.map((testCase, index) => (
              <div key={index} className="bg-background rounded-lg border p-3">
                <div className="mb-2 font-semibold">{testCase.name}</div>
                <div className="text-muted-foreground mb-2 text-xs">
                  Data: {JSON.stringify(testCase.data, null, 2)}
                </div>
                <Button
                  onClick={() => {
                    addResult(`\n🧪 Running: ${testCase.name}`);
                    simulateBackendMessage(testCase.data);
                  }}
                  disabled={!isReady}
                  size="sm"
                  variant="outline"
                >
                  Run Test
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-card border-border mb-6 rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-foreground text-xl font-semibold">Test Results</h2>
            <Button onClick={() => setTestResults([])} variant="outline" size="sm">
              Clear
            </Button>
          </div>
          <div className="bg-background max-h-96 space-y-1 overflow-y-auto rounded border p-3 font-mono text-xs">
            {testResults.length === 0 ? (
              <div className="text-muted-foreground">
                No test results yet. Run a test case above.
              </div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {result}
                </div>
              ))
            )}
          </div>
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
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 border-border mt-6 rounded-lg border p-4">
          <h3 className="text-foreground mb-2 font-semibold">Test Instructions</h3>
          <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
            <li>Wait for the player status to show &quot;✅ Ready&quot;</li>
            <li>Click &quot;Run Test&quot; on any test case to simulate backend data</li>
            <li>Check the test results to see how data is bound and processed</li>
            <li>Verify that the video starts playing (check browser console for detailed logs)</li>
            <li>Use Pause/Resume buttons to control playback</li>
          </ol>
          <div className="mt-3 rounded border border-yellow-300 bg-yellow-100 p-2 text-xs text-yellow-800">
            <strong>Note:</strong> This test simulates backend data channel messages. In production,
            the backend agent sends this data via LiveKit data channel with topic
            &quot;bhajan.track&quot;.
          </div>
        </div>
      </div>
    </div>
  );
}
