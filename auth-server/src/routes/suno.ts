import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { getStorage } from 'firebase-admin/storage';

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

        // Direct query - much more robust than parsing room names
        const snapshot = await db.collection('music_tracks')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        // Normalize tracks for backward compatibility
        const tracks = snapshot.docs.map(doc => {
            const data = doc.data();

            // NEW FORMAT: Track array structure
            // If tracks array exists and has items, use first track's data
            if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
                const firstTrack = data.tracks[0];
                return {
                    id: doc.id,
                    title: data.title,
                    prompt: data.prompt,
                    category: data.category,
                    metadata: data.metadata,
                    status: data.status,
                    createdAt: data.createdAt,
                    isPublic: data.isPublic,
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
async function downloadAndStoreAudio(audioUrl: string, trackId: string): Promise<string> {
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

        const filename = `${trackId}${ext}`;
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
async function downloadAndStoreImage(imageUrl: string, trackId: string): Promise<string> {
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

        const filename = `cover${ext}`;
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

const COIN_SERVICE_URL = process.env.COIN_SERVICE_URL || 'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

/**
 * Deduct coins for music generation
 */
async function deductMusicCoins(userId: string, trackId: string, trackTitle: string) {
    try {
        console.log(`[Coin Deduction] Deducting 50 coins for user: ${userId}, track: ${trackId}`);

        // Get user's ID token for auth
        const userDoc = await getDb().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.warn(`[Coin Deduction] User ${userId} not found, skipping deduction`);
            return;
        }

        // Call coin service to deduct coins
        const response = await fetch(`${COIN_SERVICE_URL}/coins/deduct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: In production, you'd need proper auth token here
                // For now, the service might bypass auth for server-to-server calls
            },
            body: JSON.stringify({
                userId: userId,
                featureId: 'music_generation',
                metadata: {
                    trackId,
                    trackTitle,
                    source: 'suno_callback'
                }
            })
        });

        const result = await response.json() as any;

        if (result.success) {
            console.log(`[Coin Deduction] ✅ Successfully deducted coins. New balance: ${result.newBalance}`);
        } else {
            console.error(`[Coin Deduction] ❌ Failed to deduct coins:`, result.error);
        }
    } catch (error) {
        console.error(`[Coin Deduction] ❌ Error deducting coins:`, error);
        // Don't throw - we don't want coin deduction failures to break the callback
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
                            permanentAudioUrl = await downloadAndStoreAudio(track.audio_url, taskId);
                            console.log(`[Suno Callback] Stored audio in Firebase Storage: ${permanentAudioUrl}`);
                        } catch (error) {
                            console.error(`[Suno Callback] Failed to store audio, using original URL:`, error);
                            // Fall back to original URL if storage fails
                        }

                        // Download and upload image to Firebase Storage
                        let permanentImageUrl = track.image_url || null;
                        if (track.image_url) {
                            try {
                                permanentImageUrl = await downloadAndStoreImage(track.image_url, taskId);
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

                        console.log(`[Suno Callback] Adding track ${newTrack.version} (${track.id}) to document ${taskId}`);
                        batch.set(docRef, trackData, { merge: true });
                    }
                }

                await batch.commit();
                console.log(`[Suno Callback] ✅ Successfully saved ${tracks.length} track(s) to Firestore`);

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
                console.log(`[Suno Callback] Skipping - Code: ${officialPayload.code}, Type: ${officialPayload.data?.callbackType}`);
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
                            permanentAudioUrl = await downloadAndStoreAudio(clip.audio_url, legacyPayload.taskId);
                            console.log(`[Suno Callback Legacy] Stored audio in Firebase Storage: ${permanentAudioUrl}`);
                        } catch (error) {
                            console.error(`[Suno Callback Legacy] Failed to store audio, using original URL:`, error);
                            // Fall back to original URL if storage fails
                        }

                        // Download and upload image to Firebase Storage
                        let permanentImageUrl = clip.image_url || null;
                        if (clip.image_url) {
                            try {
                                permanentImageUrl = await downloadAndStoreImage(clip.image_url, legacyPayload.taskId);
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
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 30; // Default to 30 as per user request
        const category = query.category as string;

        console.log(`[Suno Community Tracks] Parsing params: page=${page}, limit=${limit}, category=${category}`);
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

        // Apply Sorting & Pagination
        // Note: Firestore requires an index for 'category' + 'createdAt' DESC if filtering by category.
        // Also 'audioUrl' filter + sort might need index.
        // If index is missing, this will throw an error with a link to create it.
        tracksQuery = tracksQuery.orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit);

        console.log(`[Suno Community Tracks] Querying: category=${category || 'all'}, offset=${offset}, limit=${limit}`);

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
        const { trackId } = req.body;
        const userId = req.user!.uid;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        console.log(`[Suno Video] Request to generate video for track: ${trackId} by user: ${userId}`);

        const db = getDb();

        // 1. Get the track to find Suno audioId and existing metadata
        // trackId usually maps to the document ID (which is the creation taskId)
        let docRef = db.collection('music_tracks').doc(trackId);
        let trackDoc = await docRef.get();

        if (!trackDoc.exists) {
            // Try fetching by querying audioUrl or sunoId if trackId is just a legacy ID
            // This fallback is critical if the frontend passes the audioUrl as ID for legacy tracks
            const q = await db.collection('music_tracks').where('audioUrl', '==', trackId).limit(1).get();
            if (!q.empty) {
                trackDoc = q.docs[0];
                docRef = trackDoc.ref;
            } else {
                return res.status(404).json({ error: 'Track not found' });
            }
        }

        const trackData = trackDoc.data();
        if (!trackData) return res.status(404).json({ error: 'Track data is empty' });

        // Check ownership (optional, strict mode)
        if (trackData.userId && trackData.userId !== userId) {
            console.warn(`[Suno Video] User ${userId} attempted to modify track ${trackId} owned by ${trackData.userId}`);
            // Allow it for now or return 403? "Create Video" could be allowed for public tracks?
            // Let's enforce ownership for now to save credits
            return res.status(403).json({ error: 'You do not own this track' });
        }

        // Get the audioId (sunoId) - This is REQUIRED for video generation
        const audioId = trackData.sunoId;
        if (!audioId) {
            return res.status(400).json({ error: 'Track missing Suno ID (cannot generate video)' });
        }

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
            taskId: `video_${trackDoc.id}_${Date.now()}`,
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
            await docRef.set({
                videoStatus: 'generating',
                videoTaskId: generationPayload.taskId, // Save this just in case
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return res.json({
                success: true,
                message: 'Video generation started',
                videoTaskId: generationPayload.taskId
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
router.post('/callback/video', async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        console.log(`[Suno Video Callback] Received:`, JSON.stringify(payload));

        const { code, msg, data } = payload;

        if (code === 200 && data && data.video_url) {
            const { task_id, video_url } = data;

            // Note: task_id here corresponds to the `taskId` we sent in the generation request.
            // Format: video_{trackDocId}_{timestamp}

            // We need to find the track document. 
            // 1. Try to parse ID from string
            let docId = task_id;
            if (task_id.startsWith('video_')) {
                const parts = task_id.split('_');
                if (parts.length >= 2) {
                    docId = parts[1]; // Extract original doc ID
                }
            }

            console.log(`[Suno Video Callback] Mapped task ${task_id} to doc ${docId}`);

            const db = getDb();
            const docRef = db.collection('music_tracks').doc(docId);
            const doc = await docRef.get();

            if (doc.exists) {
                await docRef.set({
                    videoUrl: video_url,
                    videoStatus: 'completed',
                    videoGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`[Suno Video Callback] ✅ Updated track ${docId} with video URL`);
            } else {
                // Fallback: search by videoTaskId field
                const q = await db.collection('music_tracks').where('videoTaskId', '==', task_id).limit(1).get();
                if (!q.empty) {
                    await q.docs[0].ref.set({
                        videoUrl: video_url,
                        videoStatus: 'completed',
                        videoGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log(`[Suno Video Callback] ✅ Updated track ${q.docs[0].id} via videoTaskId query`);
                } else {
                    console.error(`[Suno Video Callback] ❌ Could not find track for task ${task_id}`);
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

export default router;
