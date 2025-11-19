import FormData from 'form-data';
import https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';
import { splitAudioIntoChunks, cleanupChunks } from './audio-splitter.js';
// Note: Python SDK fallback available but requires Python and sarvamai package
// import { transcribeAudioWithSarvamPython } from './sarvam-transcribe-fallback.js';

interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResponse {
  text: string;
  segments?: TranscriptionSegment[];
  language?: string;
}

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_BASE_URL = 'https://api.sarvam.ai';

/**
 * Transcribe an audio file using SARVAM API (optimized for Indian languages/Hindi)
 * If the file is large (>10MB), it will be split into chunks and transcribed separately
 */
export async function transcribeAudioWithSarvam(
  audioFilePath: string,
  language: string = 'hi', // Default to Hindi
  options?: { chunkDuration?: number; maxFileSizeMB?: number }
): Promise<TranscriptionResponse> {
  if (!SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY is not set. Please configure it in your environment variables.');
  }

  const maxFileSizeMB = options?.maxFileSizeMB || 10; // Default 10MB
  const chunkDuration = options?.chunkDuration || 300; // Default 5 minutes

  // Check file size
  const stats = await fs.stat(audioFilePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  console.log(`[sarvam-transcribe] File size: ${fileSizeMB.toFixed(2)} MB`);

  // If file is large, split into chunks
  if (fileSizeMB > maxFileSizeMB) {
    console.log(`[sarvam-transcribe] File is large (${fileSizeMB.toFixed(2)} MB > ${maxFileSizeMB} MB), splitting into chunks...`);
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
  language: string
): Promise<TranscriptionResponse> {
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
    const contentType = contentTypeMap[ext] || 'audio/mpeg';
    
    console.log(`[sarvam-transcribe] Transcribing ${ext} file with content type: ${contentType}`);
    console.log(`[sarvam-transcribe] Language: ${language}`);
    
    // Create form data
    // SARVAM API may use different field names - try common patterns
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: path.basename(audioFilePath),
      contentType,
    });
    // Try different language code formats
    formData.append('language', language); // 'hi' for Hindi
    formData.append('language_code', language === 'hi' ? 'hi-IN' : language); // Some APIs use hi-IN format
    // Some SARVAM APIs may not need explicit task parameter

    // Make request to SARVAM API
    return new Promise((resolve, reject) => {
      // Set a timeout of 10 minutes for large files
      const timeout = 10 * 60 * 1000; // 10 minutes
      let timeoutId: NodeJS.Timeout | null = null;
      let req: any = null;

      timeoutId = setTimeout(() => {
        if (req) {
          req.destroy();
        }
        reject(new Error('Request timeout: Transcription took too long (max 10 minutes)'));
      }, timeout);

      // SARVAM API endpoint for transcription
      // Try different endpoint patterns - the correct one needs to be verified from SARVAM docs
      // Common patterns: /v1/asr, /api/v1/asr, /v1/speech-to-text
      // Note: SARVAM Python SDK uses different approach, REST API may differ
      const apiPath = '/v1/asr'; // Try base ASR endpoint
      
      console.log(`[sarvam-transcribe] Attempting API call to: https://api.sarvam.ai${apiPath}`);
      console.log(`[sarvam-transcribe] Using API key: ${SARVAM_API_KEY.substring(0, 10)}...`);
      
      req = https.request(
        {
          hostname: 'api.sarvam.ai',
          path: apiPath,
          method: 'POST',
          headers: {
            ...formData.getHeaders(),
            // Try multiple authentication header formats
            'api-subscription-key': SARVAM_API_KEY, // Primary header format for SARVAM
            'Authorization': `Bearer ${SARVAM_API_KEY}`, // Alternative format
            'X-API-Key': SARVAM_API_KEY, // Another alternative
          },
          timeout: timeout,
        },
        (res) => {
          if (timeoutId) clearTimeout(timeoutId);
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            console.log(`[sarvam-transcribe] Response status: ${res.statusCode}`);
            
            if (res.statusCode && res.statusCode >= 400) {
              console.error(`[sarvam-transcribe] ❌ Error response (${res.statusCode}):`, data);
              console.error(`[sarvam-transcribe] Request path: ${apiPath}`);
              console.error(`[sarvam-transcribe] Response headers:`, res.headers);
              
              // If 404, the endpoint is incorrect
              if (res.statusCode === 404) {
                console.error(`[sarvam-transcribe] ⚠️  404 Not Found - The REST API endpoint is incorrect.`);
                console.error(`[sarvam-transcribe] Current endpoint: ${apiPath}`);
                console.error(`[sarvam-transcribe] Please check SARVAM API documentation at https://docs.sarvam.ai/`);
                console.error(`[sarvam-transcribe] Common endpoints to try:`);
                console.error(`[sarvam-transcribe]   - /v1/asr`);
                console.error(`[sarvam-transcribe]   - /api/v1/asr`);
                console.error(`[sarvam-transcribe]   - /v1/speech-to-text`);
                console.error(`[sarvam-transcribe]   - /api/v1/speech-to-text`);
                console.error(`[sarvam-transcribe] Falling back to Whisper for this transcription.`);
                reject(new Error(`SARVAM API endpoint not found (404). Please check SARVAM API documentation for the correct REST endpoint. The endpoint '${apiPath}' is incorrect.`));
                return;
              }
              
              try {
                const error = JSON.parse(data);
                const errorMsg = error.error?.message || error.message || `HTTP ${res.statusCode}`;
                console.error(`[sarvam-transcribe] Parsed error:`, errorMsg);
                reject(new Error(`SARVAM API Error: ${errorMsg} (Status: ${res.statusCode})`));
              } catch {
                console.error(`[sarvam-transcribe] Raw error response:`, data.substring(0, 500));
                reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
              }
              return;
            }

            try {
              const result = JSON.parse(data);
              
              // Parse SARVAM response format
              // SARVAM typically returns: { text: "...", segments: [...] } or { transcription: "...", ... }
              // Some formats: { output: { text: "..." } } or { data: { text: "..." } }
              let transcriptionText = '';
              let segments: any[] = [];
              
              // Try different response formats
              if (result.text) {
                transcriptionText = result.text;
                segments = result.segments || [];
              } else if (result.transcription) {
                transcriptionText = typeof result.transcription === 'string' 
                  ? result.transcription 
                  : result.transcription.text || '';
                segments = result.transcription.segments || [];
              } else if (result.output) {
                transcriptionText = typeof result.output === 'string'
                  ? result.output
                  : result.output.text || '';
                segments = result.output.segments || [];
              } else if (result.data) {
                transcriptionText = typeof result.data === 'string'
                  ? result.data
                  : result.data.text || '';
                segments = result.data.segments || [];
              } else if (typeof result === 'string') {
                transcriptionText = result;
              }
              
              // Convert SARVAM segments to our format if needed
              const formattedSegments = segments.map((seg: any, index: number) => ({
                id: index,
                start: seg.start || seg.start_time || seg.startTime || 0,
                end: seg.end || seg.end_time || seg.endTime || 0,
                text: seg.text || seg.transcript || seg.transcription || '',
              }));

              console.log(`[sarvam-transcribe] ✅ Success! Text length: ${transcriptionText.length}`);
              
              resolve({
                text: transcriptionText,
                segments: formattedSegments.length > 0 ? formattedSegments : undefined,
                language: language,
              });
            } catch (error: any) {
              console.error(`[sarvam-transcribe] ❌ JSON parse error:`, error.message);
              console.error(`[sarvam-transcribe] Response data:`, data.substring(0, 500));
              reject(new Error(`Invalid JSON response: ${error.message}`));
            }
          });
        }
      );

      req.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });
      
      req.on('timeout', () => {
        if (req) req.destroy();
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error('Request timeout: Connection to SARVAM API timed out'));
      });

      formData.pipe(req);
    });
  } catch (error: any) {
    console.error('[sarvam-transcribe] Error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Transcribe audio by splitting into chunks and combining results
 */
async function transcribeAudioInChunks(
  audioFilePath: string,
  language: string,
  chunkDuration: number = 300
): Promise<TranscriptionResponse> {
  let chunkFiles: string[] = [];

  try {
    // Split audio into chunks
    chunkFiles = await splitAudioIntoChunks(audioFilePath, chunkDuration);
    console.log(`[sarvam-transcribe] Split into ${chunkFiles.length} chunks`);

    // Transcribe each chunk
    const chunkResults: TranscriptionResponse[] = [];
    let cumulativeTimeOffset = 0;

    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkPath = chunkFiles[i];
      console.log(`[sarvam-transcribe] Transcribing chunk ${i + 1}/${chunkFiles.length}...`);

      try {
        const chunkResult = await transcribeSingleAudio(chunkPath, language);

        // Adjust segment timestamps to account for chunk offset
        if (chunkResult.segments) {
          chunkResult.segments = chunkResult.segments.map((seg) => ({
            ...seg,
            start: seg.start + cumulativeTimeOffset,
            end: seg.end + cumulativeTimeOffset,
          }));
        }

        chunkResults.push(chunkResult);
        
        // Update cumulative offset
        if (chunkResult.segments && chunkResult.segments.length > 0) {
          const lastSegment = chunkResult.segments[chunkResult.segments.length - 1];
          cumulativeTimeOffset = lastSegment.end;
        } else {
          cumulativeTimeOffset += chunkDuration; // Fallback
        }
      } catch (error: any) {
        console.error(`[sarvam-transcribe] Failed to transcribe chunk ${i + 1}:`, error.message);
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

    console.log(`[sarvam-transcribe] ✅ Combined ${chunkResults.length} chunks into single transcript`);

    return {
      text: combinedText,
      segments: combinedSegments,
      language: language,
    };
  } finally {
    // Clean up chunk files
    await cleanupChunks(chunkFiles);
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
  const turns: Array<{ speaker: 'user' | 'agent'; text: string; start: number; end: number }> = [];
  
  for (let i = 0; i < transcription.segments.length; i++) {
    const segment = transcription.segments[i];
    // Alternate: even indices = user, odd = agent
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

