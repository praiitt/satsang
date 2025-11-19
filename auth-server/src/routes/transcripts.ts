import { Router } from 'express';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { getDb } from '../firebase.js';
import { listRecentMP3Files, downloadMP3FromGCS, getMP3SignedUrl } from '../services/gcs-audio.js';
import { transcribeAudio, parseConversation } from '../services/whisper-transcribe.js';
import { transcribeAudioWithSarvam, parseConversation as parseConversationSarvam } from '../services/sarvam-transcribe.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const router = Router();
const COLLECTION = 'audio_transcripts';

/**
 * GET /transcripts/audio-files
 * List the last 20 MP3 files from GCS bucket
 */
router.get('/audio-files', requireAuth, async (_req: AuthedRequest, res) => {
  try {
    const limit = parseInt((_req.query.limit as string) || '20', 10);
    const files = await listRecentMP3Files(limit);
    
    return res.json({
      success: true,
      files,
      count: files.length,
    });
  } catch (error: any) {
    console.error('[transcripts] Error listing audio files:', error);
    console.error('[transcripts] Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = error?.message || String(error);
    const GCS_BUCKET_NAME = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'satsangrecordings';
    
    if (errorMessage.includes('credentials') || errorMessage.includes('Credential')) {
      errorMessage = 'GCP credentials not configured. Please set GCP_CREDENTIALS, LIVEKIT_EGRESS_GCP_CREDENTIALS, or GOOGLE_APPLICATION_CREDENTIALS in your environment variables.';
    } else if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      errorMessage = `Failed to access bucket "${GCS_BUCKET_NAME}". Check your credentials and bucket name.`;
    }
    
    return res.status(500).json({
      error: 'Failed to list audio files',
      details: errorMessage,
    });
  }
});

/**
 * POST /transcripts/transcribe
 * Transcribe an MP3 file from GCS
 * Automatically selects service based on language:
 * - Hindi (hi) → SARVAM (optimized for Indian languages)
 * - English (en) or other → OpenAI Whisper (general purpose)
 * Body: { gcsPath: string, language?: string }
 */
router.post('/transcribe', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { gcsPath, language } = req.body as { 
      gcsPath?: string; 
      language?: string;
    };

    if (!gcsPath || typeof gcsPath !== 'string') {
      return res.status(400).json({ error: 'gcsPath is required' });
    }

    // Automatically choose transcription service based on language:
    // - Hindi (hi) → SARVAM (optimized for Indian languages)
    // - English (en) or other → Whisper (general purpose)
    const normalizedLanguage = language?.toLowerCase() || 'auto';
    const shouldUseSarvam = normalizedLanguage === 'hi' && !!process.env.SARVAM_API_KEY;
    
    if (normalizedLanguage === 'hi' && !process.env.SARVAM_API_KEY) {
      console.warn('[transcripts] ⚠️  Hindi language detected but SARVAM_API_KEY not set. Falling back to Whisper.');
    }

    // Create a temporary file to download the MP3
    const tempDir = os.tmpdir();
    const tempFileName = `transcribe_${Date.now()}_${path.basename(gcsPath)}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
      // Download MP3 from GCS to temp file
      console.log(`[transcripts] Downloading ${gcsPath} to ${tempFilePath}`);
      console.log(`[transcripts] Temp file path: ${tempFilePath}`);
      
      await downloadMP3FromGCS(gcsPath, tempFilePath);
      console.log(`[transcripts] ✅ Download completed`);

      // Verify file exists and get size
      let stats: fs.Stats | undefined;
      try {
        stats = await fs.stat(tempFilePath);
        console.log(`[transcripts] File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (statError) {
        console.error(`[transcripts] ⚠️  Failed to stat file:`, statError);
      }

      // Transcribe using selected service
      const transcriptionLanguage = language || (shouldUseSarvam ? 'hi' : undefined);
      console.log(`[transcripts] Starting transcription...`);
      console.log(`[transcripts] Service: ${shouldUseSarvam ? 'SARVAM (optimized for Hindi)' : 'OpenAI Whisper'}`);
      console.log(`[transcripts] Language: ${transcriptionLanguage || 'auto'}`);
      
      if (shouldUseSarvam) {
        console.log(`[transcripts] SARVAM_API_KEY: ${process.env.SARVAM_API_KEY ? 'SET' : 'NOT SET'}`);
      } else {
        console.log(`[transcripts] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
      }
      console.log(`[transcripts] ⏱️  This may take several minutes for large files...`);
      
      const startTime = Date.now();
      let transcription;
      try {
        transcription = shouldUseSarvam
          ? await transcribeAudioWithSarvam(tempFilePath, transcriptionLanguage || 'hi')
          : await transcribeAudio(tempFilePath, transcriptionLanguage);
      } catch (sarvamError: any) {
        // If SARVAM fails (e.g., 404 endpoint error), fall back to Whisper
        if (shouldUseSarvam && sarvamError.message?.includes('404') || sarvamError.message?.includes('endpoint')) {
          console.warn(`[transcripts] ⚠️  SARVAM failed, falling back to Whisper: ${sarvamError.message}`);
          console.log(`[transcripts] Using Whisper instead for this transcription`);
          transcription = await transcribeAudio(tempFilePath, transcriptionLanguage);
        } else {
          throw sarvamError; // Re-throw if it's not an endpoint error
        }
      }
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[transcripts] ✅ Transcription completed in ${duration}s`);

      // Parse conversation turns
      const conversation = shouldUseSarvam
        ? parseConversationSarvam(transcription)
        : parseConversation(transcription);

      // Save to Firebase
      let transcriptId: string | null = null;
      try {
        const db = getDb();
        const transcriptData = {
          gcsPath: gcsPath,
          fileName: path.basename(gcsPath),
          transcription: {
            text: transcription.text,
            language: transcription.language,
            segments: transcription.segments || [],
          },
          conversation: conversation,
          fileSize: stats?.size || 0,
          createdAt: new Date(),
          createdBy: req.user?.uid || 'unknown',
          status: 'completed',
        };

        const docRef = await db.collection(COLLECTION).add(transcriptData);
        transcriptId = docRef.id;
        console.log(`[transcripts] ✅ Saved transcript to Firestore with ID: ${transcriptId}`);
      } catch (firestoreError: any) {
        console.error('[transcripts] Failed to save to Firestore:', firestoreError);
        // Continue even if Firestore save fails
      }

      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('[transcripts] Failed to cleanup temp file:', cleanupError);
      }

      return res.json({
        success: true,
        transcriptId,
        transcription: {
          text: transcription.text,
          language: transcription.language,
          segments: transcription.segments,
        },
        conversation,
      });
    } catch (error: any) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempFilePath).catch(() => {});
      } catch {}

      throw error;
    }
  } catch (error: any) {
    console.error('[transcripts] Error transcribing:', error);
    console.error('[transcripts] Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = error?.message || String(error);
    if (errorMessage.includes('OPENAI_API_KEY')) {
      errorMessage = 'OPENAI_API_KEY is not set. Please configure it in your environment variables.';
    } else if (errorMessage.includes('HTTP 401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'Invalid OpenAI API key. Please check your OPENAI_API_KEY.';
    } else if (errorMessage.includes('HTTP 429')) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
    } else if (errorMessage.includes('file') || errorMessage.includes('download')) {
      errorMessage = `Failed to download or process audio file: ${errorMessage}`;
    }
    
    return res.status(500).json({
      error: 'Failed to transcribe audio',
      details: errorMessage,
    });
  }
});

/**
 * GET /transcripts/signed-url
 * Get a signed URL for an MP3 file (for playback)
 * Query param: gcsPath
 */
router.get('/signed-url', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const gcsPath = req.query.gcsPath as string;
    
    if (!gcsPath) {
      return res.status(400).json({ error: 'gcsPath query parameter is required' });
    }

    const signedUrl = await getMP3SignedUrl(gcsPath, 60); // 60 minutes expiry
    
    return res.json({
      success: true,
      signedUrl,
    });
  } catch (error: any) {
    console.error('[transcripts] Error getting signed URL:', error);
    return res.status(500).json({
      error: 'Failed to get signed URL',
      details: error?.message || String(error),
    });
  }
});

/**
 * GET /transcripts/:gcsPath
 * Get a stored transcription from Firebase by GCS path
 * This route must come AFTER /signed-url to avoid route conflicts
 */
router.get('/:gcsPath(*)', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const gcsPath = decodeURIComponent(req.params.gcsPath);
    
    if (!gcsPath) {
      return res.status(400).json({ error: 'gcsPath is required' });
    }

    const db = getDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where('gcsPath', '==', gcsPath)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Convert Firestore Timestamp to Date
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt;

    return res.json({
      success: true,
      transcriptId: doc.id,
      transcription: data.transcription,
      conversation: data.conversation || [],
      createdAt,
      fileName: data.fileName,
    });
  } catch (error: any) {
    console.error('[transcripts] Error fetching transcript:', error);
    return res.status(500).json({
      error: 'Failed to fetch transcript',
      details: error?.message || String(error),
    });
  }
});

export default router;

