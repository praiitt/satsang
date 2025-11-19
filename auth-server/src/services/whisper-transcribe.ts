import FormData from 'form-data';
import https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';
import { splitAudioIntoChunks, cleanupChunks } from './audio-splitter.js';

interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface TranscriptionResponse {
  text: string;
  segments?: TranscriptionSegment[];
  language?: string;
}

/**
 * Transcribe an audio file using OpenAI Whisper API
 * If the file is large (>20MB), it will be split into chunks and transcribed separately
 */
export async function transcribeAudio(
  audioFilePath: string,
  language?: string,
  options?: { chunkDuration?: number; maxFileSizeMB?: number }
): Promise<TranscriptionResponse> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const maxFileSizeMB = options?.maxFileSizeMB || 10; // Default 10MB (lower threshold for chunking)
  const chunkDuration = options?.chunkDuration || 300; // Default 5 minutes

  // Check file size
  const stats = await fs.stat(audioFilePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  console.log(`[whisper-transcribe] File size: ${fileSizeMB.toFixed(2)} MB`);

  // If file is large, split into chunks
  if (fileSizeMB > maxFileSizeMB) {
    console.log(`[whisper-transcribe] File is large (${fileSizeMB.toFixed(2)} MB > ${maxFileSizeMB} MB), splitting into chunks...`);
    return await transcribeAudioInChunks(audioFilePath, language, chunkDuration);
  }

  // Transcribe normally for smaller files
  return await transcribeSingleAudio(audioFilePath, language);
}

/**
 * Transcribe a single audio file (no splitting)
 */
async function transcribeSingleAudio(
  audioFilePath: string,
  language?: string
): Promise<TranscriptionResponse> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

  try {
    // Read the audio file
    const audioBuffer = await fs.readFile(audioFilePath);
    
    // Detect file format from extension
    const ext = path.extname(audioFilePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.flac': 'audio/flac',
    };
    const contentType = contentTypeMap[ext] || 'audio/mpeg'; // Default to MP3
    
    console.log(`[whisper-transcribe] Transcribing ${ext} file with content type: ${contentType}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: path.basename(audioFilePath),
      contentType,
    });
    formData.append('model', 'whisper-1');
    if (language) {
      formData.append('language', language); // e.g., 'hi' for Hindi
    }
    formData.append('response_format', 'verbose_json'); // Get segments for speaker detection

    // Make request to OpenAI Whisper API with timeout
    return new Promise((resolve, reject) => {
      // Set a timeout of 10 minutes for large files (Whisper can take time for long audio)
      const timeout = 10 * 60 * 1000; // 10 minutes
      let timeoutId: NodeJS.Timeout | null = null;
      let req: any = null;

      timeoutId = setTimeout(() => {
        if (req) {
          req.destroy();
        }
        reject(new Error('Request timeout: Transcription took too long (max 10 minutes)'));
      }, timeout);

      req = https.request(
        {
          hostname: 'api.openai.com',
          path: '/v1/audio/transcriptions',
          method: 'POST',
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          timeout: timeout, // Also set on the request
        },
        (res) => {
          if (timeoutId) clearTimeout(timeoutId); // Clear timeout on response
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            console.log(`[whisper-transcribe] Response status: ${res.statusCode}`);
            console.log(`[whisper-transcribe] Response headers:`, res.headers);
            
            if (res.statusCode && res.statusCode >= 400) {
              console.error(`[whisper-transcribe] ❌ Error response:`, data);
              try {
                const error = JSON.parse(data);
                const errorMsg = error.error?.message || `HTTP ${res.statusCode}`;
                console.error(`[whisper-transcribe] Parsed error:`, errorMsg);
                reject(new Error(errorMsg));
              } catch {
                console.error(`[whisper-transcribe] Raw error response:`, data.substring(0, 500));
                reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
              }
              return;
            }

            try {
              const result = JSON.parse(data);
              console.log(`[whisper-transcribe] ✅ Success! Text length: ${result.text?.length || 0}`);
              resolve(result);
            } catch (error: any) {
              console.error(`[whisper-transcribe] ❌ JSON parse error:`, error.message);
              console.error(`[whisper-transcribe] Response data:`, data.substring(0, 500));
              reject(new Error(`Invalid JSON response: ${error.message}`));
            }
          });
        }
      );

      req.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        clearTimeout(timeoutId);
        reject(new Error('Request timeout: Connection to OpenAI API timed out'));
      });

      formData.pipe(req);
    });
  } catch (error: any) {
    console.error('[whisper-transcribe] Error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Parse transcription segments to identify speaker turns (user vs agent)
 * This is a simple heuristic - in production you might want to use speaker diarization
 */
export function parseConversation(transcription: TranscriptionResponse): Array<{
  speaker: 'user' | 'agent';
  text: string;
  start: number;
  end: number;
}> {
  if (!transcription.segments || transcription.segments.length === 0) {
    return [];
  }

  // Simple heuristic: alternate segments between user and agent
  // In a real implementation, you'd use speaker diarization or timestamps
  const turns: Array<{ speaker: 'user' | 'agent'; text: string; start: number; end: number }> = [];
  
  for (let i = 0; i < transcription.segments.length; i++) {
    const segment = transcription.segments[i];
    // Alternate: even indices = user, odd = agent (or vice versa)
    // You might need to adjust this based on your actual recording pattern
    const speaker = i % 2 === 0 ? 'user' : 'agent';
    
    turns.push({
      speaker,
      text: segment.text.trim(),
      start: segment.start,
      end: segment.end,
    });
  }

  return turns;
}

/**
 * Transcribe audio by splitting into chunks and combining results
 */
async function transcribeAudioInChunks(
  audioFilePath: string,
  language?: string,
  chunkDuration: number = 300
): Promise<TranscriptionResponse> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
  let chunkFiles: string[] = [];

  try {
    // Split audio into chunks
    chunkFiles = await splitAudioIntoChunks(audioFilePath, chunkDuration);
    console.log(`[whisper-transcribe] Split into ${chunkFiles.length} chunks`);

    // Transcribe each chunk
    const chunkResults: TranscriptionResponse[] = [];
    let cumulativeTimeOffset = 0; // Track time offset for combining segments

    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkPath = chunkFiles[i];
      console.log(`[whisper-transcribe] Transcribing chunk ${i + 1}/${chunkFiles.length}...`);

      try {
        const chunkResult = await transcribeSingleAudio(chunkPath, language);

        // Adjust segment timestamps to account for chunk offset
        if (chunkResult.segments) {
          chunkResult.segments = chunkResult.segments.map((seg) => ({
            ...seg,
            start: seg.start + cumulativeTimeOffset,
            end: seg.end + cumulativeTimeOffset,
            seek: seg.seek + cumulativeTimeOffset,
          }));
        }

        chunkResults.push(chunkResult);
        
        // Update cumulative offset based on actual last segment end time
        if (chunkResult.segments && chunkResult.segments.length > 0) {
          const lastSegment = chunkResult.segments[chunkResult.segments.length - 1];
          cumulativeTimeOffset = lastSegment.end;
        } else {
          cumulativeTimeOffset += chunkDuration; // Fallback to approximate duration
        }
      } catch (error: any) {
        console.error(`[whisper-transcribe] Failed to transcribe chunk ${i + 1}:`, error.message);
        // Continue with other chunks even if one fails
      }
    }

    if (chunkResults.length === 0) {
      throw new Error('All chunks failed to transcribe');
    }

    // Combine all transcripts
    const combinedText = chunkResults.map((r) => r.text).join(' ');
    const combinedSegments: TranscriptionSegment[] = [];
    chunkResults.forEach((r) => {
      if (r.segments) {
        combinedSegments.push(...r.segments);
      }
    });

    // Sort segments by start time
    combinedSegments.sort((a, b) => a.start - b.start);

    // Re-number segment IDs
    combinedSegments.forEach((seg, index) => {
      seg.id = index;
    });

    console.log(`[whisper-transcribe] ✅ Combined ${chunkResults.length} chunks into single transcript`);

    return {
      text: combinedText,
      segments: combinedSegments,
      language: chunkResults[0]?.language,
    };
  } finally {
    // Clean up chunk files
    await cleanupChunks(chunkFiles);
  }
}

