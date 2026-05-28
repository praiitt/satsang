import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { getStorage } from 'firebase-admin/storage';
import { generateSearchTerms } from '../utils/searchUtils.js';
const router = Router();

/**
 * GET /api/suno/my-tracks
 * Fetch tracks associated with the user's room sessions (extracted Room IDs)
 */
router.get('/my-tracks', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const uid = req.user!.uid;
        const db = getDb();

        console.log(`[Suno My Tracks] ===== REQUEST START =====`);
        console.log(`[Suno My Tracks] Authenticated UID: ${uid}`);
        console.log(`[Suno My Tracks] User email: ${req.user!.email}`);
        console.log(`[Suno My Tracks] Querying Firestore for userId: ${uid}`);

        const query = req.query || {};
        const page = parseInt(String(query.page || '1'));
        const limit = parseInt(String(query.limit || '50'));
        const search = query.search as string;
        const category = query.category as string;
        
        const offset = (page - 1) * limit;
        
        let tracksQuery: FirebaseFirestore.Query = db.collection('music_tracks').where('userId', '==', uid);
        
        if (category && category !== 'all') {
            tracksQuery = tracksQuery.where('category', '==', category);
        }
        
        if (search) {
            const searchTerms = search.toLowerCase().split(/[\s,.\-!?"'()\[\]{}|\\/;:_]+/).filter(w => w.length >= 3).slice(0, 10);
            if (searchTerms.length > 0) {
                tracksQuery = tracksQuery.where('search_terms', 'array-contains-any', searchTerms);
            }
        }
        
        // When using array-contains or array-contains-any, orderBy might require an index on search_terms.
        // We fallback to client-side sorting or just order if we know an index exists.
        tracksQuery = tracksQuery.orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit);

        const snapshot = await tracksQuery.get();

        // Normalize tracks for backward compatibility
        const tracks = snapshot.docs.map(doc => {
            const data = doc.data();

            // NEW FORMAT: Track array structure
            // If tracks array exists and has items, use first track's data
            if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
                const firstTrack = data.tracks[0];
                return {
                    id: doc.id,
                    shareId: data.shareId || doc.id,
                    title: data.title,
                    prompt: data.prompt,
                    category: data.category,
                    metadata: data.metadata,
                    status: data.status,
                    createdAt: data.createdAt,
                    isPublic: data.isPublic,
                    story: data.story,
                    lyrics: data.lyrics,
                    healingBenefits: data.healingBenefits,
                    tags: data.tags,
                    source: data.source || null,
                    // Video fields — critical for showing/hiding Create Video button
                    videoUrl: data.videoUrl || null,
                    videoStatus: data.videoStatus || null,
                    generatedVideoImages: data.generatedVideoImages || [],
                    // Primary track data from array
                    audioUrl: firstTrack.audioUrl,
                    imageUrl: firstTrack.imageUrl,
                    sunoId: firstTrack.sunoId,
                    duration: firstTrack.duration,
                    // Include full tracks array for frontend to access versions
                    tracks: data.tracks,
                };
            }

            // OLD FORMAT: Root-level audioUrl (backward compatibility)
            return {
                id: doc.id,
                ...data,
                tracks: [], // Empty array for consistency
            };
        });

        return res.json({ tracks });

    } catch (error) {
        console.error('[Suno My Tracks] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch my tracks' });
    }
});

/**
 * Download audio file from Suno URL and upload to Firebase Storage
 * Returns permanent Firebase Storage URL
 */
async function downloadAndStoreAudio(audioUrl: string, trackId: string, sunoId?: string): Promise<string> {
    try {
        console.log(`[Storage] Downloading audio from: ${audioUrl}`);

        // Download the audio file
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract filename from URL or use a default
        const urlPath = new URL(audioUrl).pathname;
        const originalFilename = urlPath.split('/').pop() || 'audio.mp3';

        // Determine file extension (default to .mp3 if not found)
        const ext = originalFilename.includes('.')
            ? originalFilename.substring(originalFilename.lastIndexOf('.'))
            : '.mp3';

        // Use sunoId if available for uniqueness, otherwise fallback (which might overwrite if not careful)
        const filename = sunoId ? `${sunoId}${ext}` : `${trackId}${ext}`;
        const storagePath = `music-tracks/${trackId}/${filename}`;

        console.log(`[Storage] Uploading to: ${storagePath}`);

        // Get Firebase Storage bucket (Explicit string to avoid default bucket issues)
        const bucketName = 'rraasi-8a619-music-storage';
        const bucket = getStorage().bucket(bucketName);
        console.log(`[Storage] 🔍 Using bucket: ${bucket.name}`);
        const file = bucket.file(storagePath);

        // Upload the file
        await file.save(buffer, {
            metadata: {
                contentType: 'audio/mpeg',
                metadata: {
                    firebaseStorageDownloadTokens: admin.firestore.FieldValue.serverTimestamp()
                }
            },
            // public: true, // REMOVED: Causes error with Uniform Bucket-Level Access
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`[Storage] ✅ Uploaded successfully: ${publicUrl}`);
        return publicUrl;

    } catch (error: any) {
        console.error(`[Storage] ❌ Error downloading/uploading audio:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        if (error.response) {
            console.error(`[Storage] Error Response Data:`, JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

/**
 * Download image file from Suno URL and upload to Firebase Storage
 * Returns permanent Firebase Storage URL
 */
async function downloadAndStoreImage(imageUrl: string, trackId: string, sunoId?: string): Promise<string> {
    try {
        console.log(`[Storage] Downloading image from: ${imageUrl}`);

        // Download the image file
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract filename from URL or use a default
        const urlPath = new URL(imageUrl).pathname;
        const originalFilename = urlPath.split('/').pop() || 'cover.jpg';

        // Determine file extension (default to .jpg if not found)
        const ext = originalFilename.includes('.')
            ? originalFilename.substring(originalFilename.lastIndexOf('.'))
            : '.jpg';

        // Use sunoId if available
        const filename = sunoId ? `${sunoId}${ext}` : `cover${ext}`;
        const storagePath = `music-tracks/${trackId}/${filename}`;

        console.log(`[Storage] Uploading image to: ${storagePath}`);

        // Get Firebase Storage bucket
        const bucketName = 'rraasi-8a619-music-storage';
        const bucket = getStorage().bucket(bucketName);
        const file = bucket.file(storagePath);

        // Determine content type based on extension
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.webp') contentType = 'image/webp';

        // Upload the file
        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                    firebaseStorageDownloadTokens: admin.firestore.FieldValue.serverTimestamp()
                }
            },
            // public: true, // REMOVED: Causes error with Uniform Bucket-Level Access
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`[Storage] ✅ Uploaded image successfully: ${publicUrl}`);
        return publicUrl;

    } catch (error) {
        console.error(`[Storage] ❌ Error downloading/uploading image:`, error);
        throw error;
    }
}

/**
 * Download video from URL and store in Firebase Storage
 * Returns the permanent Firebase Storage URL
 */
async function downloadAndStoreVideo(videoUrl: string, trackId: string): Promise<string> {
    try {
        console.log(`[Storage] Downloading video from: ${videoUrl}`);

        // Download the video file
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filename = `video.mp4`;
        const storagePath = `music-tracks/${trackId}/${filename}`;

        console.log(`[Storage] Uploading video to: ${storagePath}`);

        // Get Firebase Storage bucket
        const bucketName = 'rraasi-8a619-music-storage';
        const bucket = getStorage().bucket(bucketName);
        const file = bucket.file(storagePath);

        // Upload the file
        await file.save(buffer, {
            metadata: {
                contentType: 'video/mp4',
                metadata: {
                    firebaseStorageDownloadTokens: admin.firestore.FieldValue.serverTimestamp()
                }
            },
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`[Storage] ✅ Uploaded video successfully: ${publicUrl}`);
        return publicUrl;

    } catch (error) {
        console.error(`[Storage] ❌ Error downloading/uploading video:`, error);
        throw error;
    }
}

const COIN_SERVICE_URL = process.env.COIN_SERVICE_URL || 'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

/**
 * Deduct coins for music generation via coin service internal endpoint.
 * Called after audioUrl is successfully written to Firestore.
 */
async function deductMusicCoins(userId: string, trackId: string, trackTitle: string) {
    try {
        console.log(`[Coin Deduction] Deducting music_generation coins for user: ${userId}, track: ${trackId}`);

        const response = await fetch(`${COIN_SERVICE_URL}/internal/deduct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || ''
            },
            body: JSON.stringify({
                userId,
                featureId: 'music_generation',
                metadata: { trackId, trackTitle, source: 'suno_callback' }
            })
        });

        const result = await response.json() as any;
        if (result.success) {
            console.log(`[Coin Deduction] ✅ Music coins deducted. New balance: ${result.newBalance}`);
        } else {
            // Not enough coins is not a critical error — don't block the callback
            console.warn(`[Coin Deduction] ⚠️ Could not deduct music coins: ${result.error}`);
        }
    } catch (error) {
        console.error(`[Coin Deduction] ❌ Error calling coin service:`, error);
        // Don't throw — coin deduction failure must never break the music callback
    }
}

// Official Suno API Callback Payload Format (from docs.sunoapi.org)
interface SunoOfficialCallbackPayload {
    code: number;  // 200 for success, 400/451/500 for errors
    msg: string;   // Status message
    data: {
        callbackType: 'text' | 'first' | 'complete' | 'error';  // Callback type
        task_id: string;  // Task ID
        data: Array<{
            id: string;
            audio_url: string;
            source_audio_url: string;
            stream_audio_url: string;
            source_stream_audio_url: string;
            image_url: string;
            source_image_url: string;
            prompt: string;
            model_name: string;
            title: string;
            tags: string;
            createTime: string;
            duration: number;
        }>;
    };
}

// Legacy format (for backwards compatibility if needed)
interface SunoLegacyCallbackPayload {
    taskId: string;
    status: string;
    clips?: Array<{
        id: string;
        title: string;
        audio_url: string;
        video_url?: string;
        image_url?: string;
        lyric?: string;
        created_at: string;
        model_name: string;
        status: string;
        gpt_description_prompt?: string;
        prompt?: string;
        style?: string;
        tags?: string;
    }>;
}

/**
 * POST /api/suno/callback
 * Receives callbacks from Suno API when music generation is complete
 * Supports both official and legacy callback formats
 */
router.post('/callback', async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const query = req.query || {};
        // Initial candidate for userId from query param (fallback)
        let userId = (query.userId as string) || 'default_user';

        console.log(`[Suno Callback] Received. Query userId: ${userId}`);
        console.log(`[Suno Callback] Full payload:`, JSON.stringify(payload, null, 2));

        // Detect payload format
        const isOfficialFormat = payload.code !== undefined && payload.data?.callbackType !== undefined;

        if (isOfficialFormat) {
            // Official Suno API format
            const officialPayload = payload as SunoOfficialCallbackPayload;
            console.log(`[Suno Callback] Official format - Code: ${officialPayload.code}, Type: ${officialPayload.data.callbackType}`);

            // Only process successful callbacks with complete or first status
            if (officialPayload.code === 200 &&
                (officialPayload.data.callbackType === 'complete' || officialPayload.data.callbackType === 'first')) {

                const tracks = officialPayload.data.data || [];
                const taskId = officialPayload.data.task_id; // Get task_id from callback payload
                console.log(`[Suno Callback] Processing ${tracks.length} track(s) for Task ID: ${taskId}`);

                const db = getDb();
                const musicTracksRef = db.collection('music_tracks');
                const batch = db.batch();

                for (const track of tracks) {
                    console.log(`[Suno Callback] Processing track: ${track.id} - ${track.title}`);
                    if (track.audio_url) {
                        // CHECK FOR DUPLICATES: Check if a track with this sunoId already exists
                        // This prevents creating duplicate entries or reprocessing the same track
                        const duplicateCheck = await musicTracksRef.where('sunoId', '==', track.id).limit(1).get();

                        if (!duplicateCheck.empty) {
                            const existingDoc = duplicateCheck.docs[0];
                            console.log(`[Suno Callback] ⚠️ Duplicate detected! Track with sunoId ${track.id} already exists at ${existingDoc.id}. Skipping insertion.`);
                            continue;
                        }

                        // Use taskId as document ID to merge with pending record created by agent
                        const docRef = musicTracksRef.doc(taskId);
                        const existingDoc = await docRef.get();
                        const exists = existingDoc.exists;
                        const existingData = exists ? existingDoc.data() : {};

                        // TRUST THE INITIATOR: If database already has a valid userId, keep it.
                        // The Agent creates the record with the most accurate context.
                        // The callback URL query param is a fallback and might be 'default_user' if agent metadata was slow.
                        if (existingData && existingData.userId && existingData.userId !== 'default_user') {
                            console.log(`[Suno Callback] Preserving existing userId: ${existingData.userId} (ignoring query param: ${userId})`);
                            userId = existingData.userId;
                        }

                        // Get existing tracks array
                        const existingTracks = (existingData?.tracks || []) as any[];

                        // Check if this specific track already exists (prevent duplicate callback processing)
                        const trackExists = existingTracks.some((t: any) => t.sunoId === track.id);
                        if (trackExists) {
                            console.log(`[Suno Callback] Track ${track.id} already exists in document ${taskId}, skipping`);
                            continue;
                        }

                        // Download and upload audio to Firebase Storage
                        let permanentAudioUrl = track.audio_url;
                        try {
                            // Pass track.id as sunoId for unique filename
                            permanentAudioUrl = await downloadAndStoreAudio(track.audio_url, taskId, track.id);
                            console.log(`[Suno Callback] Stored audio in Firebase Storage: ${permanentAudioUrl}`);
                        } catch (error) {
                            console.error(`[Suno Callback] Failed to store audio, using original URL:`, error);
                            // Fall back to original URL if storage fails
                        }

                        // Download and upload image to Firebase Storage
                        let permanentImageUrl = track.image_url || null;
                        if (track.image_url) {
                            try {
                                // Pass track.id as sunoId for unique filename
                                permanentImageUrl = await downloadAndStoreImage(track.image_url, taskId, track.id);
                                console.log(`[Suno Callback] Stored image in Firebase Storage: ${permanentImageUrl}`);
                            } catch (error) {
                                console.error(`[Suno Callback] Failed to store image, using original URL:`, error);
                                // Fall back to original URL if storage fails
                            }
                        }

                        // Build track object (track-specific fields only)
                        const newTrack = {
                            sunoId: track.id,
                            audioUrl: permanentAudioUrl, // Use Firebase Storage URL
                            sourceAudioUrl: track.source_audio_url || null,
                            streamAudioUrl: track.stream_audio_url || null,
                            imageUrl: permanentImageUrl, // Use Firebase Storage URL
                            sourceImageUrl: track.source_image_url || null,
                            version: existingTracks.length + 1,
                            duration: track.duration || null,
                            createTime: track.createTime || null,
                            model_name: track.model_name || null,
                        };

                        // Prepare document update (preserve agent metadata at root)
                        const trackData: any = {
                            userId: userId,
                            taskId: taskId,
                            status: 'COMPLETED',
                            tracks: [...existingTracks, newTrack],
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        };

                        // Preserve or set metadata from agent/track
                        if (!exists) {
                            // New document - set title and metadata from track
                            trackData.title = track.title || 'Untitled Track';
                            trackData.prompt = track.prompt || null;
                            trackData.tags = track.tags || null;
                            trackData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                            trackData.coinsDeducted = false;
                            trackData.isPublic = false;
                            trackData.category = (query.category as string) || 'rraasi-music';
                        } else if (existingData) {
                            // Existing document - preserve agent metadata, only update status and tracks
                            // Keep title, prompt, metadata.healingProperties etc from agent
                            if (existingData.title) trackData.title = existingData.title;
                            if (existingData.prompt) trackData.prompt = existingData.prompt;
                            if (existingData.metadata) trackData.metadata = existingData.metadata;
                            if (existingData.category) trackData.category = existingData.category;
                            if (typeof existingData.isPublic !== 'undefined') trackData.isPublic = existingData.isPublic;
                        }

                        trackData.search_terms = generateSearchTerms(trackData);

                        console.log(`[Suno Callback] Adding track ${newTrack.version} (${track.id}) to document ${taskId}`);
                        batch.set(docRef, trackData, { merge: true });
                    }
                }

                await batch.commit();
                console.log(`[Suno Callback] ✅ Successfully saved ${tracks.length} track(s) to Firestore`);

                // --- Satsang Plan Auto-Link ---
                if (query.planId) {
                    const planId = query.planId as string;
                    console.log(`[Suno Callback] Received planId: ${planId}. Linking track to Satsang Plan.`);
                    try {
                        const planRef = db.collection('satsang_plans').doc(planId);
                        
                        const firstTrack = tracks[0];
                        if (firstTrack) {
                            const trackDoc = await musicTracksRef.doc(taskId).get();
                            const trackData = trackDoc.data();
                            
                            // Grab the finalized storage URLs from the newly updated track document
                            const finalizedTracks = trackData?.tracks || [];
                            const completedTrack = finalizedTracks.find((t: any) => t.sunoId === firstTrack.id);
                            
                            if (completedTrack && completedTrack.audioUrl) {
                                await planRef.update({
                                    meditation_audio_url: completedTrack.audioUrl,
                                    meditation_image_url: completedTrack.imageUrl || null,
                                    meditation_title: trackData?.title || firstTrack.title || 'Satsang Meditation',
                                    meditation_track_id: taskId
                                });
                                console.log(`[Suno Callback] ✅ Automatically linked track ${taskId} to Satsang Plan ${planId} as meditation.`);
                            }
                        }
                    } catch (err) {
                        console.error(`[Suno Callback] ❌ Failed to auto-link to Satsang Plan:`, err);
                    }
                }
                // --- End Satsang Plan Auto-Link ---

                // Deduct coins ONCE per taskId (not per track)
                const docRef = musicTracksRef.doc(taskId);
                const doc = await docRef.get();
                if (!doc.data()?.coinsDeducted) {
                    const firstTrack = tracks[0];
                    if (firstTrack?.audio_url) {
                        await deductMusicCoins(userId, taskId, doc.data()?.title || firstTrack.title);
                        await docRef.update({ coinsDeducted: true });
                        console.log(`[Suno Callback] ✅ Coins deducted for task ${taskId}`);
                    }
                } else {
                    console.log(`[Suno Callback] Coins already deducted for task ${taskId}, skipping.`);
                }
            } else {
                console.log(`[Suno Callback] Failed/Error Callback - Code: ${officialPayload.code}, Type: ${officialPayload.data?.callbackType}`);
                
                // If the generation failed on Suno's side, update the track status to FAILED
                const taskId = officialPayload.data?.task_id;
                if (taskId) {
                    try {
                        const db = getDb();
                        const docRef = db.collection('music_tracks').doc(taskId);
                        const doc = await docRef.get();
                        if (doc.exists) {
                            await docRef.update({
                                status: 'FAILED',
                                error: officialPayload.msg || 'Suno generation failed',
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                            console.log(`[Suno Callback] ❌ Marked track ${taskId} as FAILED in database`);
                        }
                    } catch (err) {
                        console.error(`[Suno Callback] Error updating failed status for task ${taskId}:`, err);
                    }
                }
            }
        } else {
            // Legacy format (backwards compatibility)
            const legacyPayload = payload as SunoLegacyCallbackPayload;
            console.log(`[Suno Callback] Legacy format - Status: ${legacyPayload.status}`);

            if (legacyPayload.status === 'SUCCESS' && legacyPayload.clips && legacyPayload.clips.length > 0) {
                const db = getDb();
                const musicTracksRef = db.collection('music_tracks');
                const batch = db.batch();

                for (const clip of legacyPayload.clips) {
                    console.log(`[Suno Callback] Processing clip: ${clip.id} - ${clip.title}`);
                    if (clip.audio_url) {
                        // CHECK FOR DUPLICATES (Legacy)
                        const duplicateCheck = await musicTracksRef.where('sunoId', '==', clip.id).limit(1).get();
                        if (!duplicateCheck.empty) {
                            console.log(`[Suno Callback] ⚠️ Duplicate detected (Legacy)! Track ${clip.id} already exists. Skipping.`);
                            continue;
                        }

                        // FIX: Use taskId as document ID to match Agent and Official handler behavior
                        // This prevents creating duplicate docs (one by TaskID, one by ClipID)
                        const docRef = musicTracksRef.doc(legacyPayload.taskId);
                        const existingDoc = await docRef.get();
                        const exists = existingDoc.exists;
                        const existingData = exists ? existingDoc.data() : {};

                        // TRUST THE INITIATOR (Legacy path)
                        if (existingData && existingData.userId && existingData.userId !== 'default_user') {
                            userId = existingData.userId;
                        }

                        // Download and upload audio to Firebase Storage
                        let permanentAudioUrl = clip.audio_url;
                        try {
                            // Pass clip.id as sunoId
                            permanentAudioUrl = await downloadAndStoreAudio(clip.audio_url, legacyPayload.taskId, clip.id);
                            console.log(`[Suno Callback Legacy] Stored audio in Firebase Storage: ${permanentAudioUrl}`);
                        } catch (error) {
                            console.error(`[Suno Callback Legacy] Failed to store audio, using original URL:`, error);
                            // Fall back to original URL if storage fails
                        }

                        // Download and upload image to Firebase Storage
                        let permanentImageUrl = clip.image_url || null;
                        if (clip.image_url) {
                            try {
                                // Pass clip.id as sunoId
                                permanentImageUrl = await downloadAndStoreImage(clip.image_url, legacyPayload.taskId, clip.id);
                                console.log(`[Suno Callback Legacy] Stored image in Firebase Storage: ${permanentImageUrl}`);
                            } catch (error) {
                                console.error(`[Suno Callback Legacy] Failed to store image, using original URL:`, error);
                                // Fall back to original URL if storage fails
                            }
                        }

                        const trackData: any = {
                            userId: userId,
                            sunoId: clip.id,
                            title: clip.title || 'Untitled Track',
                            audioUrl: permanentAudioUrl, // Use Firebase Storage URL
                            videoUrl: clip.video_url || null,
                            imageUrl: permanentImageUrl, // Use Firebase Storage URL
                            status: 'COMPLETED',
                            metadata: {
                                model_name: clip.model_name || null,
                                prompt: clip.prompt || null,
                                tags: clip.tags || null
                            },
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            isPublic: false,
                            category: (query.category as string) || 'rraasi-music'
                        };

                        if (!exists) {
                            trackData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                            trackData.coinsDeducted = false;
                        }

                        batch.set(docRef, trackData, { merge: true });
                    }
                }

                await batch.commit();
                console.log(`[Suno Callback] ✅ Successfully saved ${legacyPayload.clips.length} track(s) to Firestore (legacy format)`);

                // Deduct coins for successful music generation
                for (const clip of legacyPayload.clips) {
                    if (clip.audio_url) {
                        const docRef = musicTracksRef.doc(clip.id);
                        const doc = await docRef.get();
                        if (!doc.data()?.coinsDeducted) {
                            await deductMusicCoins(userId, clip.id, clip.title);
                            await docRef.update({ coinsDeducted: true });
                        } else {
                            console.log(`[Suno Callback] Coins already deducted for clip ${clip.id}, skipping.`);
                        }
                    }
                }
            } else {
                console.log(`[Suno Callback] No tracks to save - Status: ${legacyPayload.status}`);
            }
        }

        // Always return 200 to acknowledge receipt (as per Suno docs)
        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('[Suno Callback] ❌ Error processing callback:', error);
        // Still return 200 to prevent retries on our errors
        res.status(200).json({ status: 'error', message: 'Internal processing error' });
    }
});

/**
 * GET /api/suno/tracks
 * Get music tracks for a user (Generic endpoint)
 */
router.get('/tracks', async (req: Request, res: Response) => {
    try {
        const userId = (req.query?.userId as string) || 'default_user';
        const limit = parseInt(req.query?.limit as string) || 10;

        console.log(`[Suno Tracks] userId=${userId}, req.query exists? ${!!req.query}`);

        const db = getDb();
        const snapshot = await db
            .collection('music_tracks')
            .where('userId', '==', userId)
            .limit(limit)
            .get();

        // Sort in memory instead of using orderBy (which requires composite index)
        const tracks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a: any, b: any) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime; // Descending order
            });

        res.json({ tracks });
    } catch (error) {
        console.error('[Suno Tracks] Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

/**
 * GET /api/suno/community-tracks
 * Get music tracks created by all users (paginated)
 */
router.get('/community-tracks', async (req: Request, res: Response) => {
    try {
        const query = req.query || {};
        console.log(`[Suno Community Tracks] Raw Query:`, JSON.stringify(query));

        const page = parseInt(String(query.page || '1'));
        // Fix limit parsing and increase default
        let limitStr = query.limit;
        if (Array.isArray(limitStr)) limitStr = limitStr[0]; // Handle duplicate params
        const limit = parseInt(String(limitStr || '50')); // Default increased to 50

        const category = query.category as string;
        const search = query.search as string;
        console.log(`[Suno Community Tracks] Resolved Params: page=${page}, limit=${limit}, category=${category}, search=${search}`);
        const offset = (page - 1) * limit;

        const db = getDb();
        let tracksQuery: FirebaseFirestore.Query = db.collection('music_tracks');
        let countQuery: FirebaseFirestore.Query = db.collection('music_tracks');

        // Apply Category Filter
        if (category && category !== 'all') {
            tracksQuery = tracksQuery.where('category', '==', category);
            countQuery = countQuery.where('category', '==', category);
        }

        // Filter by COMPLETED status to ensure we don't return pending/failed tracks
        // This fixes the "Load More" issue where pages might be full of incomplete tracks
        tracksQuery = tracksQuery.where('status', '==', 'COMPLETED');
        countQuery = countQuery.where('status', '==', 'COMPLETED');

        // Only show tracks that are explicitly public
        tracksQuery = tracksQuery.where('isPublic', '==', true);
        countQuery = countQuery.where('isPublic', '==', true);

        if (search) {
            const searchTerms = search.toLowerCase().split(/[\s,.\-!?"'()\[\]{}|\\/;:_]+/).filter(w => w.length >= 3).slice(0, 10);
            if (searchTerms.length > 0) {
                tracksQuery = tracksQuery.where('search_terms', 'array-contains-any', searchTerms);
                countQuery = countQuery.where('search_terms', 'array-contains-any', searchTerms);
            }
        }

        // Apply Sorting & Pagination
        // Note: Firestore requires an index for 'category' + 'createdAt' DESC if filtering by category.
        // Also 'audioUrl' filter + sort might need index.
        // If index is missing, this will throw an error with a link to create it.
        tracksQuery = tracksQuery.orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit);

        console.log(`[Suno Community Tracks] Querying: category=${category || 'all'}, search=${search}, offset=${offset}, limit=${limit}`);

        // Get count
        const countSnapshot = await countQuery.count().get();
        const total = countSnapshot.data().count;

        const snapshot = await tracksQuery.get();

        const tracks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json({
            tracks,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + tracks.length < total
        });
    } catch (error) {
        console.error('[Suno Community Tracks] Error fetching community tracks:', error);
        res.status(500).json({
            error: 'Failed to fetch community tracks',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/suno/public-art
 * Get public AI-generated art (images and videos) from community tracks
 */
router.get('/public-art', async (req: Request, res: Response) => {
    try {
        const query = req.query || {};
        const page = parseInt(String(query.page || '1'));
        let limitStr = query.limit;
        if (Array.isArray(limitStr)) limitStr = limitStr[0];
        const limit = parseInt(String(limitStr || '50'));
        const type = query.type as string; // 'all', 'image', 'video'
        const search = query.search as string;
        const offset = (page - 1) * limit;

        const db = getDb();
        
        let tracksQuery = db.collection('music_tracks')
            .where('status', '==', 'COMPLETED')
            .where('isPublic', '==', true);

        if (search) {
            const searchTerms = search.toLowerCase().split(/[\s,.\-!?"'()\[\]{}|\\/;:_]+/).filter(w => w.length >= 3).slice(0, 10);
            if (searchTerms.length > 0) {
                tracksQuery = tracksQuery.where('search_terms', 'array-contains-any', searchTerms);
            }
        }

        tracksQuery = tracksQuery.orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit);

        const snapshot = await tracksQuery.get();

        const artItems: any[] = [];

        snapshot.docs.forEach(doc => {
            const track = doc.data();
            const trackId = doc.id;
            
            if (type !== 'image' && track.videoUrl) {
                artItems.push({
                    id: `${trackId}_video`,
                    type: 'video',
                    url: track.videoUrl,
                    trackId,
                    trackTitle: track.title || 'Untitled',
                    prompt: track.prompt || track.description || '',
                    ownerId: track.userId,
                    createdAt: track.createdAt
                });
            }

            if (type !== 'video' && track.generatedVideoImages && Array.isArray(track.generatedVideoImages)) {
                track.generatedVideoImages.forEach((imgUrl: string, idx: number) => {
                    artItems.push({
                        id: `${trackId}_img_${idx}`,
                        type: 'image',
                        url: imgUrl,
                        trackId,
                        trackTitle: track.title || 'Untitled',
                        prompt: track.prompt || track.description || '',
                        ownerId: track.userId,
                        createdAt: track.createdAt
                    });
                });
            }
        });

        res.json({
            artItems,
            page,
            hasMore: snapshot.docs.length === limit
        });
    } catch (error) {
        console.error('[Suno Public Art] Error fetching art:', error);
        res.status(500).json({
            error: 'Failed to fetch public art',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/suno/buy-track
 * Purchase exclusive rights to a public community track.
 */
router.post('/buy-track', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const { trackId } = req.body;
        const buyerId = req.user!.uid;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        const db = getDb();
        const trackRef = db.collection('music_tracks').doc(trackId);
        const trackSnap = await trackRef.get();

        if (!trackSnap.exists) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const trackData = trackSnap.data()!;
        if (!trackData.isPublic) {
            return res.status(400).json({ error: 'This track is no longer available for purchase' });
        }

        const creatorId = trackData.userId;
        if (buyerId === creatorId) {
            return res.status(400).json({ error: 'You already own this track' });
        }

        const COIN_SERVICE_URL = process.env.COIN_SERVICE_URL || 'http://localhost:4002';
        const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-rraasi-token-42'; // Match token from coin service

        // Step 1: Deduct 25 coins from buyer
        const deductRes = await fetch(`${COIN_SERVICE_URL}/internal/deduct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-token': INTERNAL_TOKEN
            },
            body: JSON.stringify({
                userId: buyerId,
                featureId: 'buy_exclusive_track',
                metadata: { trackId, creatorId }
            })
        });

        if (!deductRes.ok) {
            if (deductRes.status === 402) {
                return res.status(402).json({ error: 'Not enough coins' });
            }
            throw new Error(`Coin deduction failed: ${deductRes.statusText}`);
        }

        // Step 2: Add 15 coins to creator's payout balance
        const payoutRes = await fetch(`${COIN_SERVICE_URL}/internal/add-payout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-token': INTERNAL_TOKEN
            },
            body: JSON.stringify({
                userId: creatorId,
                amount: 15
            })
        });

        if (!payoutRes.ok) {
            console.error('[Buy Track] Failed to add payout to creator:', creatorId);
            // Non-fatal, but we should log it heavily. We still transfer ownership since buyer paid.
        }

        // Step 3: Transfer ownership in Firestore
        await trackRef.update({
            userId: buyerId,
            isPublic: false,
            originalCreatorId: creatorId,
            purchasedAt: new Date(),
            search_terms: require('firebase-admin').firestore.FieldValue.delete() // Optional: clear search terms
        });

        res.json({ success: true, message: 'Track successfully purchased' });

    } catch (error) {
        console.error('[Buy Track] Error:', error);
        res.status(500).json({
            error: 'Failed to process purchase',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/suno/publish
 * Toggle the public visibility of a music track
 */
router.post('/publish', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const { trackId, isPublic } = req.body;
        const userId = req.user!.uid;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        const db = getDb();
        const docRef = db.collection('music_tracks').doc(trackId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const trackData = doc.data();
        if (trackData?.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized to publish this track' });
        }

        const newPublicStatus = !!isPublic;
        await docRef.update({ 
            isPublic: newPublicStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[Suno Publish] User ${userId} marked track ${trackId} as isPublic=${newPublicStatus}`);
        res.json({ success: true, isPublic: newPublicStatus });
    } catch (error) {
        console.error('[Suno Publish] Error:', error);
        res.status(500).json({ error: 'Failed to update track visibility' });
    }
});

/**
 * POST /api/suno/publish/bulk
 * Toggle the public visibility of multiple music tracks
 */
router.post('/publish/bulk', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const { trackIds, isPublic } = req.body;
        const userId = req.user!.uid;

        if (!Array.isArray(trackIds) || trackIds.length === 0) {
            return res.status(400).json({ error: 'trackIds array is required' });
        }

        const db = getDb();
        const batch = db.batch();
        const newPublicStatus = !!isPublic;
        
        // Due to the possibility of large arrays, let's chunk it manually
        // But Firestore batch supports up to 500 operations which is usually enough for UI scale
        if (trackIds.length > 500) {
            return res.status(400).json({ error: 'Too many tracks. Max 500.' });
        }

        const fetchPromises = trackIds.map(async (trackId) => {
            const docRef = db.collection('music_tracks').doc(trackId);
            const doc = await docRef.get();
            if (doc.exists && doc.data()?.userId === userId) {
                batch.update(docRef, { 
                    isPublic: newPublicStatus,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });

        await Promise.all(fetchPromises);
        await batch.commit();

        console.log(`[Suno Publish Bulk] User ${userId} marked ${trackIds.length} tracks as isPublic=${newPublicStatus}`);
        res.json({ success: true, count: trackIds.length, isPublic: newPublicStatus });
    } catch (error) {
        console.error('[Suno Publish Bulk] Error:', error);
        res.status(500).json({ error: 'Failed to bulk update track visibility' });
    }
});

/**
 * POST /api/suno/sync
 * Manually sync the status of a specific track from Suno API
 * Use this when callback fails or is delayed.
 */
router.post('/sync', async (req: Request, res: Response) => {
    try {
        const { taskId, userId } = req.body;

        if (!taskId) {
            return res.status(400).json({ error: 'taskId is required' });
        }

        console.log(`[Suno Sync] Manual sync requested for task: ${taskId}`);

        // 1. Get current doc to ensure ownership
        const db = getDb();
        const docRef = db.collection('music_tracks').doc(taskId); // We used taskId as docId in agent
        const doc = await docRef.get();

        if (!doc.exists) {
            // Try searching by field if doc ID isn't taskId (legacy compatibility)
            const querySnapshot = await db.collection('music_tracks').where('sunoId', '==', taskId).limit(1).get();
            if (querySnapshot.empty) {
                return res.status(404).json({ error: 'Track not found in database' });
            }
            // Found via query
            const trackDoc = querySnapshot.docs[0];
            // Update reference
            // docRef = trackDoc.ref; // const assignment error, we'll handle logical flow below

            // Re-implement flow for queried doc
            await processSync(trackDoc.ref, taskId, trackDoc.data(), userId);
            return res.json({ success: true, message: 'Sync processed via query' });
        }

        // Process for direct doc match
        await processSync(docRef, taskId, doc.data(), userId);
        return res.json({ success: true, message: 'Sync processed' });

    } catch (error) {
        console.error('[Suno Sync] Error syncing track:', error);
        res.status(500).json({ error: 'Failed to sync track status' });
    }
});

/**
 * Helper to process the sync logic
 */
async function processSync(docRef: admin.firestore.DocumentReference, taskId: string, data: any, userId?: string) {
    // Optional: Verify ownership if userId provided
    if (userId && data.userId && data.userId !== userId) {
        throw new Error('Unauthorized: Track belongs to another user');
    }

    // 2. Call Suno API to get status
    // Using the unofficial API standard endpoint
    const sunoUrl = `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`;
    const sunoKey = process.env.SUNO_API_KEY;

    if (!sunoKey) {
        throw new Error('Server missing SUNO_API_KEY');
    }

    const response = await fetch(sunoUrl, {
        headers: {
            'Authorization': `Bearer ${sunoKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`Suno API responded with ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Suno Sync] API Result for ${taskId}:`, JSON.stringify(result));

    // 3. Update Firestore if complete
    // Unofficial wrapper returns { code: 200, data: { status: 'COMPLETE', response: { ... } } } 
    // OR directly the data depending on version. Let's handle generic "audio_url" presence.

    // Normalize data structure based on inspection
    const trackInfo = (result as any).data?.response || (result as any).data || result;
    // Check various paths where audio_url might be
    const audioUrl = trackInfo.audio_url || (Array.isArray(trackInfo) ? trackInfo[0]?.audio_url : null);

    if (audioUrl) {
        const updates: any = {
            audioUrl: audioUrl,
            status: 'COMPLETED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Add other metadata if available
        if (trackInfo.image_url) updates.imageUrl = trackInfo.image_url;
        if (trackInfo.title) updates.title = trackInfo.title;
        if (trackInfo.duration) updates.metadata = { ...data.metadata, duration: trackInfo.duration };

        await docRef.set(updates, { merge: true });
        console.log(`[Suno Sync] ✅ Updated track ${taskId} with audioUrl`);

        // Trigger Coin Deduction if not already done
        if (!data.coinsDeducted && data.userId) {
            await deductMusicCoins(data.userId, taskId, updates.title || data.title || 'Synced Track');
            await docRef.update({ coinsDeducted: true });
        }
    } else {
        console.log(`[Suno Sync] Track ${taskId} still pending or no audioUrl found`);
    }
}

/**
 * POST /api/suno/generate-video
 * Trigger MP4 video generation for a track
 */
router.post('/generate-video', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const { trackId, sunoId } = req.body;
        const userId = req.user!.uid;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        console.log(`[Suno Video] Request to generate video for track: ${trackId} (sunoId: ${sunoId}) by user: ${userId}`);

        const db = getDb();

        // 1. Get the track to find Suno audioId and existing metadata
        // trackId maps to the document ID (taskId)
        let docRef = db.collection('music_tracks').doc(trackId);
        let trackDoc = await docRef.get();

        if (!trackDoc.exists) {
            // Fallback: Query by sunoId (legacy or mismatched ID)
            const q = await db.collection('music_tracks').where('sunoId', '==', trackId).limit(1).get();
            if (!q.empty) {
                trackDoc = q.docs[0];
                docRef = trackDoc.ref;
            } else {
                // Double fallback: Check if it's inside 'tracks' array (expensive but needed for correctness if trackId is sunoId)
                // Or query by audioUrl
                const q2 = await db.collection('music_tracks').where('audioUrl', '==', trackId).limit(1).get();
                if (!q2.empty) {
                    trackDoc = q2.docs[0];
                    docRef = trackDoc.ref;
                } else {
                    return res.status(404).json({ error: 'Track not found' });
                }
            }
        }

        const trackData = trackDoc.data();
        if (!trackData) return res.status(404).json({ error: 'Track data is empty' });

        // Check ownership
        if (trackData.userId && trackData.userId !== userId) {
            console.warn(`[Suno Video] User ${userId} attempted to modify track ${trackId} owned by ${trackData.userId}`);
            return res.status(403).json({ error: 'You do not own this track' });
        }

        // Get the audioId (sunoId) - This is REQUIRED for video generation
        // Use provided sunoId (preferable) or fallback to root sunoId
        const audioId = sunoId || trackData.sunoId;

        if (!audioId) {
            // Try to find it in tracks array if available
            if (trackData.tracks && Array.isArray(trackData.tracks) && trackData.tracks.length > 0) {
                // If no specific sunoId requested, maybe default to first? Or fail?
                // Let's default to first for robustness
                console.log('[Suno Video] defaulting to first track sunoId');
                // But wait, if provided sunoId is valid, we're good.
            }
            if (!audioId && (!trackData.tracks || trackData.tracks.length === 0)) {
                return res.status(400).json({ error: 'Track missing Suno ID (cannot generate video)' });
            }
        }

        // Ensure audioId is valid (simple check)
        if (!audioId) return res.status(400).json({ error: 'Could not determine Suno ID for video generation' });

        // Check if video already exists or is processing
        if (trackData.videoUrl) {
            return res.status(409).json({ error: 'Video already exists', videoUrl: trackData.videoUrl });
        }
        if (trackData.videoStatus === 'generating') {
            return res.status(409).json({ error: 'Video generation already in progress' });
        }

        // 2. Call Suno API
        const sunoKey = process.env.SUNO_API_KEY;
        const callbackUrl = `${process.env.AUTH_SERVER_URL || 'https://rraasi.com'}/api/suno/callback/video`;

        if (!sunoKey) {
            throw new Error('Server missing SUNO_API_KEY');
        }

        const generationPayload = {
            taskId: trackData.taskId || trackId, // Use the original generation Task ID (which is the Doc ID)
            audioId: audioId,
            callBackUrl: callbackUrl,
            author: "RRAASI Music",
            domainName: "rraasi.com"
        };

        console.log(`[Suno Video] calling API with:`, generationPayload);

        const response = await fetch('https://api.sunoapi.org/api/v1/mp4/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sunoKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(generationPayload)
        });

        const result: any = await response.json();
        console.log(`[Suno Video] API Response:`, result);

        if (response.ok && result.code === 200) {
            // 3. Update Firestore status
            // IMPORTANT: Save the NEW taskId returned by Suno, not the one we sent.
            // Suno generates a new unique ID for the video generation task.
            const newVideoTaskId = result.data?.taskId;

            await docRef.set({
                videoStatus: 'generating',
                videoTaskId: newVideoTaskId || generationPayload.taskId, // Prefer new ID
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return res.json({
                success: true,
                message: 'Video generation started',
                videoTaskId: newVideoTaskId
            });
        } else {
            console.error('[Suno Video] Failed:', result);
            return res.status(500).json({
                error: 'Failed to start video generation',
                details: result.msg || result.error
            });
        }

    } catch (error) {
        console.error('[Suno Video] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/suno/callback/video
 * Specific callback handler for MP4 video generation
 */
// Video Callback Endpoint
router.post('/callback/video', async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        console.log(`[Suno Video Callback] Received:`, JSON.stringify(payload, null, 2));

        const { code, data } = payload;

        // Try to find videoUrl in various places
        let videoUrl = data?.video_url || data?.response?.videoUrl || data?.videoUrl;
        let taskId = data?.task_id || data?.taskId;

        if (code === 200 && videoUrl && taskId) {

            // We need to find the track document. 
            // 1. Try to parse ID from string (legacy format: video_{docId}_{timestamp})
            let docId = taskId;
            if (taskId.startsWith('video_')) {
                const parts = taskId.split('_');
                if (parts.length >= 2) {
                    docId = parts[1]; // Extract original doc ID
                }
            }

            console.log(`[Suno Video Callback] Processing task ${taskId} (mapped docId: ${docId}) with video: ${videoUrl}`);

            // Download and store video in Firebase Storage
            let permanentVideoUrl = videoUrl;
            try {
                permanentVideoUrl = await downloadAndStoreVideo(videoUrl, docId);
                console.log(`[Suno Video Callback] Stored video in Firebase Storage: ${permanentVideoUrl}`);
            } catch (error) {
                console.error(`[Suno Video Callback] Failed to store video, using original URL:`, error);
                // Fall back to original URL
            }

            const db = getDb();
            let docRef = db.collection('music_tracks').doc(docId);
            let doc = await docRef.get();

            // If direct lookup by ID works, use it.
            if (doc.exists) {
                await docRef.set({
                    videoUrl: permanentVideoUrl, // Use stored URL
                    videoStatus: 'completed',
                    videoGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`[Suno Video Callback] ✅ Updated track ${docId} with video URL`);
            } else {
                // Fallback: search by videoTaskId field (stored during generation)
                console.log(`[Suno Video Callback] Track ${docId} not found directly. Searching by videoTaskId: ${taskId}`);
                const q = await db.collection('music_tracks').where('videoTaskId', '==', taskId).limit(1).get();

                if (!q.empty) {
                    const foundDoc = q.docs[0];
                    await foundDoc.ref.set({
                        videoUrl: permanentVideoUrl, // Use stored URL
                        videoStatus: 'completed',
                        videoGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log(`[Suno Video Callback] ✅ Updated track ${foundDoc.id} via videoTaskId query`);
                    console.error(`[Suno Video Callback] ❌ Could not find track for task ${taskId}`);
                }
            }
        } else {
            console.warn(`[Suno Video Callback] Received unsuccessful or incomplete data:`, payload);
        }

        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('[Suno Video Callback] Error:', error);
        res.status(200).json({ status: 'error' }); // Always 200 to acknowledge
    }
});

/**
 * GET /api/suno/favorites
 * Get all favorited tracks for the authenticated user
 */
router.get('/favorites', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const uid = req.user!.uid;
        const db = getDb();

        const favSnapshot = await db
            .collection('favorites')
            .doc(uid)
            .collection('tracks')
            .orderBy('favoritedAt', 'desc')
            .get();

        if (favSnapshot.empty) {
            return res.json({ tracks: [], total: 0 });
        }

        // Get the track IDs
        const favDocs = favSnapshot.docs.map(d => ({ trackId: d.id, favoritedAt: d.data().favoritedAt }));

        // Fetch all the actual track documents in parallel
        const trackPromises = favDocs.map(async ({ trackId, favoritedAt }) => {
            const trackDoc = await db.collection('music_tracks').doc(trackId).get();
            if (!trackDoc.exists) return null;
            return { id: trackDoc.id, favoritedAt, ...trackDoc.data() };
        });

        const tracks = (await Promise.all(trackPromises)).filter(Boolean);

        res.json({ tracks, total: tracks.length });
    } catch (error) {
        console.error('[Favorites] Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

/**
 * POST /api/suno/favorites
 * Add a track to the user's favorites
 */
router.post('/favorites', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const uid = req.user!.uid;
        const { trackId } = req.body;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        const db = getDb();
        await db
            .collection('favorites')
            .doc(uid)
            .collection('tracks')
            .doc(trackId)
            .set({ favoritedAt: admin.firestore.FieldValue.serverTimestamp() });

        res.json({ success: true, message: 'Track added to favorites' });
    } catch (error) {
        console.error('[Favorites] Error adding favorite:', error);
        res.status(500).json({ error: 'Failed to add favorite' });
    }
});

/**
 * DELETE /api/suno/favorites/:trackId
 * Remove a track from the user's favorites
 */
router.delete('/favorites/:trackId', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const uid = req.user!.uid;
        const { trackId } = req.params;

        const db = getDb();
        await db
            .collection('favorites')
            .doc(uid)
            .collection('tracks')
            .doc(trackId)
            .delete();

        res.json({ success: true, message: 'Track removed from favorites' });
    } catch (error) {
        console.error('[Favorites] Error removing favorite:', error);
        res.status(500).json({ error: 'Failed to remove favorite' });
    }
});

/**
 * GET /api/suno/favorites/ids
 * Get just the IDs of the user's favorited tracks (lightweight for UI state)
 */
router.get('/favorites/ids', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const uid = req.user!.uid;
        const db = getDb();

        const favSnapshot = await db
            .collection('favorites')
            .doc(uid)
            .collection('tracks')
            .get();

        const ids = favSnapshot.docs.map(d => d.id);
        res.json({ ids });
    } catch (error) {
        console.error('[Favorites] Error fetching favorite IDs:', error);
        res.status(500).json({ error: 'Failed to fetch favorite IDs' });
    }
});

export default router;
