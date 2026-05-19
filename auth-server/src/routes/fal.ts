import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { generateSearchTerms } from '../utils/searchUtils.js';

const router = Router();

/**
 * Download audio file from URL and upload to Firebase Storage
 * Returns permanent Firebase Storage URL
 */
async function downloadAndStoreAudio(audioUrl: string, trackId: string, fileId: string): Promise<string> {
    try {
        console.log(`[Fal Storage] Downloading audio from: ${audioUrl}`);

        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const urlPath = new URL(audioUrl).pathname;
        const originalFilename = urlPath.split('/').pop() || 'audio.wav';
        const ext = originalFilename.includes('.') ? originalFilename.substring(originalFilename.lastIndexOf('.')) : '.wav';

        const filename = `${fileId}${ext}`;
        const storagePath = `music-tracks/${trackId}/${filename}`;

        console.log(`[Fal Storage] Uploading to: ${storagePath}`);

        const bucketName = 'rraasi-8a619-music-storage';
        const bucket = getStorage().bucket(bucketName);
        const file = bucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: ext === '.mp3' ? 'audio/mpeg' : 'audio/wav',
                metadata: {
                    firebaseStorageDownloadTokens: admin.firestore.FieldValue.serverTimestamp()
                }
            }
        });

        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`[Fal Storage] ✅ Uploaded successfully: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error(`[Fal Storage] ❌ Error downloading/uploading audio:`, error);
        throw error;
    }
}

/**
 * POST /api/fal/callback
 * Receives callbacks from fal.ai when generation is complete
 */
router.post('/callback', async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const query = req.query || {};
        let userId = (query.userId as string) || 'default_user';

        console.log(`[Fal Callback] Received. Query userId: ${userId}`);
        console.log(`[Fal Callback] Payload:`, JSON.stringify(payload, null, 2));

        // Format is { status: "OK"|"ERROR", request_id: "...", payload: { audio_file: { url: "..." } } }
        const taskId = payload.request_id;
        if (!taskId) {
            console.warn('[Fal Callback] No request_id provided in payload.');
            return res.status(200).json({ status: 'ignored' });
        }

        const db = getDb();
        const musicTracksRef = db.collection('music_tracks');
        const docRef = musicTracksRef.doc(taskId);
        
        if (payload.status === 'ERROR') {
            console.log(`[Fal Callback] ❌ Generation failed for task ${taskId}:`, payload.error);
            await docRef.set({
                status: 'FAILED',
                error: payload.error || 'fal.ai generation failed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return res.status(200).json({ status: 'received error' });
        }

        if (payload.status === 'OK' && payload.payload) {
            const audioData = payload.payload.audio_file;
            if (audioData && audioData.url) {
                console.log(`[Fal Callback] Processing audio for Task ID: ${taskId}`);

                const existingDoc = await docRef.get();
                const exists = existingDoc.exists;
                const existingData = exists ? existingDoc.data() : {};

                if (existingData && existingData.userId && existingData.userId !== 'default_user') {
                    userId = existingData.userId;
                }

                // Upload to Firebase Storage
                let permanentAudioUrl = audioData.url;
                try {
                    permanentAudioUrl = await downloadAndStoreAudio(audioData.url, taskId, 'fal_audio');
                } catch (err) {
                    console.error('[Fal Callback] Failed to store in Firebase, using direct URL', err);
                }

                const existingTracks = (existingData?.tracks || []) as any[];
                const newTrack = {
                    sunoId: taskId, // Keep sunoId field for compatibility
                    provider: 'fal',
                    audioUrl: permanentAudioUrl,
                    version: existingTracks.length + 1,
                    createTime: new Date().toISOString(),
                    model_name: 'fal-ai',
                };

                const trackData: any = {
                    userId: userId,
                    taskId: taskId,
                    status: 'COMPLETED',
                    provider: existingData?.provider || 'fal', // Maintain fallback flag if present
                    tracks: [...existingTracks, newTrack],
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (!exists) {
                    trackData.title = 'Untitled Track';
                    trackData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                    trackData.isPublic = false;
                    trackData.category = (query.category as string) || 'rraasi-music';
                }

                trackData.search_terms = generateSearchTerms(Object.assign({}, existingData, trackData));

                await docRef.set(trackData, { merge: true });
                console.log(`[Fal Callback] ✅ Successfully saved track to Firestore`);
            }
        }

        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('[Fal Callback] ❌ Error processing callback:', error);
        res.status(200).json({ status: 'error', message: 'Internal processing error' });
    }
});

export default router;
