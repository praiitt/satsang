import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const execAsync = promisify(exec);
const router = Router();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python transcription script
// In production (compiled JS), __dirname points to dist/routes/
// In development (tsx), __dirname points to src/routes/
const getTranscribeScriptPath = () => {
  // Try multiple possible paths
  const possiblePaths = [
    path.resolve(__dirname, '../../scripts/transcribe_audio.py'),
    path.resolve(process.cwd(), 'auth-server/scripts/transcribe_audio.py'),
    path.resolve(process.cwd(), 'scripts/transcribe_audio.py'),
    path.join(__dirname, '../../scripts/transcribe_audio.py'),
  ];
  
  for (const scriptPath of possiblePaths) {
    try {
      if (fs.existsSync(scriptPath)) {
        return scriptPath;
      }
    } catch {
      // Continue to next path
    }
  }
  
  // Default fallback
  return path.resolve(__dirname, '../../scripts/transcribe_audio.py');
};

const TRANSCRIBE_SCRIPT = getTranscribeScriptPath();

/**
 * POST /api/transcript/audio
 * 
 * Extract transcript from audio URL (MP3/OGG/WAV) using Whisper.
 * Returns formatted conversation transcript.
 * 
 * Body:
 *   - audio_url: string (required) - URL of audio file
 *   - chunk_duration?: number (optional, default: 300) - Chunk duration in seconds
 *   - language?: string (optional, default: 'hi') - Language code for transcription
 *   - async?: boolean (optional, default: false) - If true, return immediately and process in background
 * 
 * Response:
 *   {
 *     success: boolean,
 *     transcript?: string,
 *     conversation?: Array<{speaker: string, text: string, timestamp: number}>,
 *     duration?: number,
 *     chunks_processed?: number,
 *     character_count?: number,
 *     error?: string
 *   }
 */
router.post('/audio', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { audio_url, chunk_duration = 300, language = 'hi', async: asyncMode = false } = req.body;

    if (!audio_url) {
      return res.status(400).json({
        success: false,
        error: 'Missing audio_url',
      });
    }

    // Validate URL
    try {
      new URL(audio_url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio_url format',
      });
    }

    console.log(`[transcript] Starting transcription for: ${audio_url}`);
    console.log(`[transcript] Chunk duration: ${chunk_duration}s, Language: ${language}`);

    // If async mode, return immediately and process in background
    if (asyncMode) {
      // Start background processing
      processAudioTranscriptionAsync(audio_url, chunk_duration, language, req.user?.uid).catch(
        (error) => {
          console.error('[transcript] Background processing error:', error);
        }
      );

      return res.status(202).json({
        success: true,
        status: 'processing',
        message: 'Audio transcript extraction started in background',
        audio_url,
        estimated_time: '5-15 minutes depending on audio length',
      });
    }

    // Synchronous processing
    const result = await processAudioTranscription(audio_url, chunk_duration, language);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('[transcript] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process audio transcription',
    });
  }
});

/**
 * Process audio transcription by calling Python script.
 */
async function processAudioTranscription(
  audioUrl: string,
  chunkDuration: number,
  language: string
): Promise<any> {
  try {
    // Check if Python script exists
    const fs = await import('fs/promises');
    try {
      await fs.access(TRANSCRIBE_SCRIPT);
    } catch {
      throw new Error(`Transcription script not found at: ${TRANSCRIBE_SCRIPT}`);
    }

    // Check if Python is available
    try {
      await execAsync('python3 --version');
    } catch {
      try {
        await execAsync('python --version');
      } catch {
        throw new Error('Python 3 not found. Please install Python 3.');
      }
    }

    // Build command
    const cmd = `python3 "${TRANSCRIBE_SCRIPT}" --audio-url "${audioUrl}" --chunk-duration ${chunkDuration} --language "${language}"`;

    console.log(`[transcript] Executing: ${cmd}`);

    // Execute Python script
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 30 * 60 * 1000, // 30 minutes timeout
    });

    if (stderr) {
      console.warn('[transcript] Python script stderr:', stderr);
    }

    // Parse JSON output
    const result = JSON.parse(stdout);

    console.log(`[transcript] ✅ Transcription completed successfully`);
    console.log(`[transcript] Transcript length: ${result.character_count || 0} characters`);
    console.log(`[transcript] Conversation turns: ${result.conversation?.length || 0}`);

    return result;
  } catch (error: any) {
    console.error('[transcript] Processing error:', error);
    
    // Try to parse error from stderr
    if (error.stderr) {
      try {
        const errorResult = JSON.parse(error.stderr);
        return errorResult;
      } catch {
        // Not JSON, use as error message
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to process audio transcription',
    };
  }
}

/**
 * Process audio transcription asynchronously in background.
 */
async function processAudioTranscriptionAsync(
  audioUrl: string,
  chunkDuration: number,
  language: string,
  userId?: string
): Promise<void> {
  try {
    const result = await processAudioTranscription(audioUrl, chunkDuration, language);
    
    // Optionally save to Firestore or database
    if (result.success && userId) {
      try {
        const { getDb } = await import('../firebase.js');
        const db = getDb();
        
        await db.collection('transcripts').add({
          userId,
          audioUrl,
          transcript: result.transcript,
          conversation: result.conversation,
          duration: result.duration,
          chunksProcessed: result.chunks_processed,
          characterCount: result.character_count,
          language,
          processedAt: new Date(),
          createdAt: new Date(),
        });
        
        console.log(`[transcript] ✅ Saved transcript to Firestore for user: ${userId}`);
      } catch (firestoreError: any) {
        console.error('[transcript] Failed to save to Firestore:', firestoreError);
      }
    }
  } catch (error: any) {
    console.error('[transcript] Async processing error:', error);
  }
}

export default router;
