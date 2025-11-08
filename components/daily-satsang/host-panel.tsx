'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';

export interface DailySatsangConfig {
  topic: string;
  introBhajanVideoId?: string;
  closingBhajanVideoId?: string;
}

interface HostPanelProps {
  config: DailySatsangConfig;
  onConfigChange: (config: DailySatsangConfig) => void;
  onStart: () => void;
}

const SUGGESTED_TOPICS = [
  'भक्ति और आध्यात्मिकता',
  'कर्म और धर्म',
  'मोक्ष और मुक्ति',
  'गुरु की महिमा',
  'सत्संग का महत्व',
  'प्रेम और करुणा',
  'सत्य और अहिंसा',
  'ध्यान और साधना',
];

const SUGGESTED_BHAJANS = [
  { videoId: 'dQw4w9WgXcQ', name: 'हरि हरि बोलो' }, // Example - replace with actual YouTube video IDs
  { videoId: 'jNQXAC9IVRw', name: 'राम नाम' },
  { videoId: 'kJQP7kiw5Fk', name: 'ओम नमः शिवाय' },
];

export function HostPanel({ config, onConfigChange, onStart }: HostPanelProps) {
  const [showPanel, setShowPanel] = useState(true);
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
  const [searchType, setSearchType] = useState<'intro' | 'closing' | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(searchQuery + ' bhajan')}&maxResults=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.videos || []);
      } else {
        console.error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (!showPanel) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowPanel(true)}
        className="fixed top-4 right-4 z-50"
      >
        ⚙️ सेटिंग्स
      </Button>
    );
  }

  return (
    <div className="border-border bg-card fixed top-4 right-4 z-50 max-w-sm rounded-xl border p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-lg font-bold">होस्ट सेटिंग्स</h3>
        <Button variant="ghost" size="icon" onClick={() => setShowPanel(false)}>
          ✕
        </Button>
      </div>

      <div className="space-y-4">
        {/* Topic Selection */}
        <div>
          <label className="text-foreground mb-2 block text-sm font-semibold">विषय (Topic)</label>
          <input
            type="text"
            value={config.topic}
            onChange={(e) => onConfigChange({ ...config, topic: e.target.value })}
            placeholder="आज का विषय लिखें..."
            className="border-input bg-background text-foreground h-10 w-full rounded-lg border px-3 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => onConfigChange({ ...config, topic })}
                className="bg-muted hover:bg-muted/80 text-foreground rounded-full px-2 py-1 text-xs transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Intro Bhajan */}
        <div>
          <label className="text-foreground mb-2 block text-sm font-semibold">
            प्रारंभिक भजन (YouTube Video ID)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.introBhajanVideoId || ''}
              onChange={(e) =>
                onConfigChange({ ...config, introBhajanVideoId: e.target.value || undefined })
              }
              placeholder="YouTube Video ID या URL"
              className="border-input bg-background text-foreground flex-1 rounded-lg border px-3 py-2 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchType('intro');
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              🔍 खोजें
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTED_BHAJANS.map((bhajan) => (
              <button
                key={bhajan.videoId}
                onClick={() => onConfigChange({ ...config, introBhajanVideoId: bhajan.videoId })}
                className="bg-muted hover:bg-muted/80 text-foreground rounded-full px-2 py-1 text-xs transition-colors"
              >
                {bhajan.name}
              </button>
            ))}
          </div>
        </div>

        {/* Closing Bhajan */}
        <div>
          <label className="text-foreground mb-2 block text-sm font-semibold">
            समापन भजन (YouTube Video ID)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.closingBhajanVideoId || ''}
              onChange={(e) =>
                onConfigChange({ ...config, closingBhajanVideoId: e.target.value || undefined })
              }
              placeholder="YouTube Video ID या URL"
              className="border-input bg-background text-foreground flex-1 rounded-lg border px-3 py-2 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchType('closing');
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              🔍 खोजें
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTED_BHAJANS.map((bhajan) => (
              <button
                key={bhajan.videoId}
                onClick={() => onConfigChange({ ...config, closingBhajanVideoId: bhajan.videoId })}
                className="bg-muted hover:bg-muted/80 text-foreground rounded-full px-2 py-1 text-xs transition-colors"
              >
                {bhajan.name}
              </button>
            ))}
          </div>
        </div>

        {/* YouTube Search Modal */}
        {searchType && (
          <div className="border-border bg-background fixed inset-0 z-[60] flex items-center justify-center rounded-xl border p-4 shadow-2xl">
            <div className="bg-card border-border w-full max-w-md rounded-xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-foreground text-lg font-bold">
                  YouTube में भजन खोजें ({searchType === 'intro' ? 'प्रारंभिक' : 'समापन'})
                </h4>
                <Button variant="ghost" size="icon" onClick={() => setSearchType(null)}>
                  ✕
                </Button>
              </div>
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleSearch();
                    }
                  }}
                  placeholder="भजन का नाम खोजें..."
                  className="border-input bg-background text-foreground flex-1 rounded-lg border px-3 py-2 text-sm"
                />
                <Button
                  variant="primary"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                >
                  {isSearching ? 'खोज रहे...' : 'खोजें'}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {searchResults.map((video) => (
                    <button
                      key={video.videoId}
                      onClick={() => {
                        if (searchType === 'intro') {
                          onConfigChange({ ...config, introBhajanVideoId: video.videoId });
                        } else {
                          onConfigChange({ ...config, closingBhajanVideoId: video.videoId });
                        }
                        setSearchType(null);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                      className="bg-muted hover:bg-muted/80 text-foreground w-full rounded-lg p-3 text-left transition-colors"
                    >
                      <div className="font-semibold">{video.title}</div>
                      <div className="text-muted-foreground mt-1 text-xs">{video.channelTitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Button variant="primary" onClick={onStart} className="w-full">
          ✅ सेटिंग्स सेव करें
        </Button>
      </div>
    </div>
  );
}
