'use client';

/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { Button } from '@/components/livekit/button';

interface AudioFile {
  name: string;
  path: string;
  size: number;
  created: Date;
  url: string;
}

interface ConversationTurn {
  speaker: 'user' | 'agent';
  text: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  text: string;
  language?: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

interface TranscriptionResponse {
  transcription: TranscriptionResult;
  conversation: ConversationTurn[];
}

const API_BASE = '/api/marketing/transcripts';

export default function TranscriptsPage() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<Record<string, TranscriptionResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  const [audioProgress, setAudioProgress] = useState<Record<string, { current: number; duration: number }>>({});
  const [isPaused, setIsPaused] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAudioFiles();
  }, []);


  const loadAudioFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/audio-files?limit=20`);
      const data = await response.json();
      
      if (data.success && data.files) {
        setAudioFiles(data.files);
        
        // Load stored transcriptions for these files
        await loadStoredTranscriptionsForFiles(data.files);
      } else {
        setError(data.error || 'Failed to load audio files');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audio files');
    } finally {
      setLoading(false);
    }
  };

  const loadStoredTranscriptionsForFiles = async (files: AudioFile[]) => {
    // Fetch stored transcriptions for each file in parallel
    const transcriptionPromises = files.map(async (file) => {
      try {
        // Encode the path properly - handle slashes and special characters
        const encodedPath = encodeURIComponent(file.path);
        const response = await fetch(`${API_BASE}/${encodedPath}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log(`✅ Loaded transcription from Firestore for: ${file.name}`);
            return { 
              path: file.path, 
              transcription: {
                transcription: data.transcription,
                conversation: data.conversation || [],
              } as TranscriptionResponse
            };
          }
        } else if (response.status === 404) {
          // No transcription found - this is normal
          console.debug(`No stored transcription for ${file.path}`);
        }
      } catch (err) {
        // Ignore errors - transcription might not exist yet
        console.debug(`Error loading transcription for ${file.path}:`, err);
      }
      return null;
    });

    const results = await Promise.all(transcriptionPromises);
    const loadedTranscriptions: Record<string, TranscriptionResponse> = {};
    
    results.forEach((result) => {
      if (result) {
        loadedTranscriptions[result.path] = result.transcription;
      }
    });

    if (Object.keys(loadedTranscriptions).length > 0) {
      console.log(`✅ Loaded ${Object.keys(loadedTranscriptions).length} stored transcriptions from Firestore`);
      setTranscriptions((prev) => ({
        ...prev,
        ...loadedTranscriptions,
      }));
    } else {
      console.log('ℹ️  No stored transcriptions found in Firestore');
    }
  };

  const getSignedUrl = async (gcsPath: string): Promise<string> => {
    if (audioUrls[gcsPath]) {
      return audioUrls[gcsPath];
    }

    try {
      const encodedPath = encodeURIComponent(gcsPath);
      const response = await fetch(`${API_BASE}/signed-url?gcsPath=${encodedPath}`);
      const data = await response.json();
      
      if (data.success && data.signedUrl) {
        setAudioUrls((prev) => ({ ...prev, [gcsPath]: data.signedUrl }));
        return data.signedUrl;
      } else {
        throw new Error(data.error || 'Failed to get signed URL');
      }
    } catch (err: any) {
      throw new Error(`Failed to get audio URL: ${err.message}`);
    }
  };

  const handlePlayAudio = async (file: AudioFile) => {
    try {
      // If already playing, pause it
      if (playingAudio === file.path && audioElements[file.path] && !audioElements[file.path].paused) {
        audioElements[file.path].pause();
        setIsPaused((prev) => ({ ...prev, [file.path]: true }));
        return;
      }

      // If paused, resume
      if (playingAudio === file.path && audioElements[file.path] && audioElements[file.path].paused) {
        await audioElements[file.path].play();
        setIsPaused((prev) => ({ ...prev, [file.path]: false }));
        return;
      }

      // Stop any currently playing audio
      Object.values(audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      setPlayingAudio(null);

      const url = await getSignedUrl(file.path);
      setPlayingAudio(file.path);
      
      // Create audio element and play
      const audio = new Audio(url);
      
      // Set up event listeners
      audio.onloadedmetadata = () => {
        setAudioProgress((prev) => ({
          ...prev,
          [file.path]: { current: 0, duration: audio.duration },
        }));
      };

      audio.ontimeupdate = () => {
        setAudioProgress((prev) => ({
          ...prev,
          [file.path]: { current: audio.currentTime, duration: audio.duration },
        }));
      };

      audio.onended = () => {
        setPlayingAudio(null);
        setIsPaused((prev) => ({ ...prev, [file.path]: false }));
        setAudioProgress((prev) => ({
          ...prev,
          [file.path]: { current: 0, duration: prev[file.path]?.duration || 0 },
        }));
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        setIsPaused((prev) => ({ ...prev, [file.path]: false }));
        setError('Failed to play audio');
      };

      audio.onpause = () => {
        setIsPaused((prev) => ({ ...prev, [file.path]: true }));
      };

      audio.onplay = () => {
        setIsPaused((prev) => ({ ...prev, [file.path]: false }));
      };

      // Store audio element
      setAudioElements((prev) => ({ ...prev, [file.path]: audio }));
      setIsPaused((prev) => ({ ...prev, [file.path]: false }));
      
      await audio.play();
    } catch (err: any) {
      setError(err.message || 'Failed to play audio');
      setPlayingAudio(null);
    }
  };

  const handleSeek = (file: AudioFile, newTime: number) => {
    const audio = audioElements[file.path];
    if (audio) {
      audio.currentTime = newTime;
      setAudioProgress((prev) => ({
        ...prev,
        [file.path]: { ...prev[file.path], current: newTime },
      }));
    }
  };

  const handleTranscribe = async (file: AudioFile) => {
    try {
      setTranscribing(file.path);
      setError(null);

      // Show file size info
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 20) {
        console.log(`Large file detected (${fileSizeMB.toFixed(2)} MB) - will be split into chunks`);
      }

      const response = await fetch(`${API_BASE}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcsPath: file.path,
          language: 'hi', // Hindi - adjust as needed
        }),
      });

      const data = await response.json();

      if (data.success) {
        const transcriptionData: TranscriptionResponse = {
          transcription: data.transcription,
          conversation: data.conversation || [],
        };
        
        setTranscriptions((prev) => ({
          ...prev,
          [file.path]: transcriptionData,
        }));
        
        console.log(`✅ Transcription saved with ID: ${data.transcriptId || 'unknown'}`);
      } else {
        // Show detailed error message
        const errorMsg = data.details || data.error || 'Failed to transcribe audio';
        setError(errorMsg);
        console.error('Transcription error:', data);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to transcribe audio';
      setError(errorMsg);
      console.error('Transcription error:', err);
    } finally {
      setTranscribing(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Audio Transcripts</h1>
        <p className="text-muted-foreground">
          View and transcribe MP3 recordings from Google Cloud Storage
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <Button onClick={loadAudioFiles} disabled={loading}>
          {loading ? 'Loading...' : '🔄 Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading audio files...</div>
      ) : audioFiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No MP3 files found in the bucket
        </div>
      ) : (
        <div className="space-y-4">
          {audioFiles.map((file) => {
            const transcription = transcriptions[file.path];
            const isTranscribing = transcribing === file.path;
            const isPlaying = playingAudio === file.path;
            const hasTranscription = !!transcription;

            return (
              <div
                key={file.path}
                className="border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg mb-1">{file.name}</h3>
                      {hasTranscription && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                          ✅ Transcribed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>📅 {formatDate(file.created)}</div>
                      <div>📦 {formatFileSize(file.size)} 
                        {(() => {
                          const fileSizeMB = file.size / (1024 * 1024);
                          return fileSizeMB > 10 
                            ? <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Will be chunked)</span>
                            : null;
                        })()}
                      </div>
                      <div className="font-mono text-xs">{file.path}</div>
                      {hasTranscription && transcription.transcription.language && (
                        <div className="text-xs">
                          🌐 Language: {transcription.transcription.language}
                          {transcription.transcription.segments && (
                            <span className="ml-2">• {transcription.transcription.segments.length} segments</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePlayAudio(file)}
                      variant="outline"
                      size="sm"
                    >
                      {isPlaying && !isPaused[file.path]
                        ? '⏸️ Pause'
                        : isPlaying && isPaused[file.path]
                        ? '▶️ Resume'
                        : '▶️ Play'}
                    </Button>
                    <Button
                      onClick={() => handleTranscribe(file)}
                      disabled={isTranscribing || hasTranscription}
                      variant={hasTranscription ? "secondary" : "default"}
                      size="sm"
                    >
                      {isTranscribing
                        ? (() => {
                            const fileSizeMB = file.size / (1024 * 1024);
                            return fileSizeMB > 10 
                              ? '⏳ Processing chunks...' 
                              : '⏳ Transcribing...';
                          })()
                        : hasTranscription
                          ? '✅ Already Transcribed'
                          : '🎤 Transcribe'}
                    </Button>
                  </div>
                </div>

                {/* Audio Player with Progress Bar */}
                {isPlaying && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max={audioProgress[file.path]?.duration || 100}
                          value={audioProgress[file.path]?.current || 0}
                          onChange={(e) => handleSeek(file, parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                              ((audioProgress[file.path]?.current || 0) /
                                (audioProgress[file.path]?.duration || 1)) *
                              100
                            }%, #e5e7eb ${
                              ((audioProgress[file.path]?.current || 0) /
                                (audioProgress[file.path]?.duration || 1)) *
                              100
                            }%, #e5e7eb 100%)`,
                          }}
                        />
                        <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                          {formatTime(audioProgress[file.path]?.current || 0)} /{' '}
                          {formatTime(audioProgress[file.path]?.duration || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Button
                          onClick={() => {
                            const audio = audioElements[file.path];
                            if (audio) {
                              audio.currentTime = Math.max(0, audio.currentTime - 10);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          ⏪ -10s
                        </Button>
                        <Button
                          onClick={() => {
                            const audio = audioElements[file.path];
                            if (audio) {
                              audio.currentTime = Math.min(
                                audio.duration,
                                audio.currentTime + 10
                              );
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          +10s ⏩
                        </Button>
                        <Button
                          onClick={() => {
                            const audio = audioElements[file.path];
                            if (audio) {
                              audio.playbackRate = audio.playbackRate === 1 ? 1.5 : audio.playbackRate === 1.5 ? 2 : 0.75;
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          {(() => {
                            const audio = audioElements[file.path];
                            const rate = audio?.playbackRate || 1;
                            return rate === 1 ? '1x' : rate === 1.5 ? '1.5x' : rate === 2 ? '2x' : '0.75x';
                          })()}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isTranscribing && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin">⏳</div>
                      <span>
                        {(() => {
                          const fileSizeMB = file.size / (1024 * 1024);
                          if (fileSizeMB > 10) {
                            return 'Splitting into chunks and transcribing... This may take several minutes for large files.';
                          }
                          return 'Transcribing audio... This may take a minute.';
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {hasTranscription && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Conversation Transcript</h4>
                      <span className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded">
                        📄 Loaded from Firestore
                      </span>
                    </div>
                    
                    {/* Full transcription text */}
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Full Text:</p>
                      <p className="text-sm whitespace-pre-wrap">{transcription.transcription.text}</p>
                      {transcription.transcription.language && (
                        <p className="text-xs text-muted-foreground mt-2">
                          🌐 Language: <span className="font-semibold">{transcription.transcription.language}</span>
                          {transcription.transcription.segments && (
                            <span className="ml-2">• {transcription.transcription.segments.length} segments</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Conversation turns */}
                    {transcription.conversation.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold mb-2">Conversation Turns:</p>
                        {transcription.conversation.map((turn, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-md ${
                              turn.speaker === 'user'
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                                : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span
                                className={`text-xs font-semibold uppercase ${
                                  turn.speaker === 'user'
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-green-700 dark:text-green-300'
                                }`}
                              >
                                {turn.speaker === 'user' ? '👤 User' : '🤖 Agent'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(turn.start)} - {formatTime(turn.end)}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{turn.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

