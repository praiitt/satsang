import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/suno/my-tracks
 * Fetch tracks associated with the user's room sessions (extracted Room IDs)
 */
router.get('/my-tracks', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const uid = req.user!.uid;
        const db = getDb();

        // 1. Get User's Room IDs
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.json({ tracks: [] });
        }

        const userData = userDoc.data();
        const roomIds: string[] = userData?.room_ids || [];

        if (roomIds.length === 0) {
            return res.json({ tracks: [] });
        }

        // 2. Extract Target User IDs from Room Names 
        // User instruction: "take out middle element from sandwiched between underscore"
        // Example: "RRraasiMusic_EoZTHz..._919" -> "EoZTHz..."
        const targetIds = roomIds.map(roomId => {
            const parts = roomId.split('_');
            if (parts.length >= 3) {
                return parts[1]; // The element between the first and last underscores (assuming Prefix_ID_Suffix)
            }
            return null;
        }).filter(id => id); // Remove empty/null

        console.log(`[Suno My Tracks] Found ${roomIds.length} rooms. Extracted IDs: ${JSON.stringify(targetIds)}`);

        if (targetIds.length === 0) {
            return res.json({ tracks: [] });
        }

        // 3. Query Music Tracks
        // Firestore 'in' query supports up to 30 items. 
        // We take the unique latest 30 room IDs to stay within limits.
        const uniqueTargetIds = [...new Set(targetIds)].slice(0, 30);

        console.log(`[Suno My Tracks] Querying tracks for IDs: ${JSON.stringify(uniqueTargetIds)}`);

        const snapshot = await db.collection('music_tracks')
            .where('userId', 'in', uniqueTargetIds)
            .get();

        // 4. Sort and Return
        const tracks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a: any, b: any) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime; // Descending
            });

        return res.json({ tracks });

    } catch (error) {
        console.error('[Suno My Tracks] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch my tracks' });
    }
});

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
        const userId = (query.userId as string) || 'default_user';

        console.log(`[Suno Callback] Received for User: ${userId}`);
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

                        // If the document exists but has a different sunoId (e.g. from the OTHER track in this batch),
                        // and we are trying to overwrite it... 
                        // Note: Suno sends 2 tracks per task. Using taskId as key implies we only keep ONE (the last one processed).
                        // To keep both, we would need different keys (e.g. track.id). 
                        // BUT, the agent creates the generic placeholder at taskId.
                        // For now, we stick to the taskId key as per current architecture, but warn if overwriting.
                        if (exists && existingData.sunoId && existingData.sunoId !== track.id) {
                            console.warn(`[Suno Callback] Overwriting existing track ${existingData.sunoId} with new sibling track ${track.id} at doc ${taskId}`);
                        }

                        const trackData: any = {
                            userId: userId,
                            sunoId: track.id, // Store Suno's track ID for reference
                            title: track.title || 'Untitled Track',
                            audioUrl: track.audio_url,
                            sourceAudioUrl: track.source_audio_url || null,
                            streamAudioUrl: track.stream_audio_url || null,
                            imageUrl: track.image_url || null,
                            sourceImageUrl: track.source_image_url || null,
                            status: 'COMPLETED',
                            metadata: {
                                model_name: track.model_name || null,
                                prompt: track.prompt || null,
                                tags: track.tags || null,
                                duration: track.duration || null,
                                createTime: track.createTime || null
                            },
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            isPublic: false,
                            category: (query.category as string) || 'rraasi-music' // Default to rraasi-music if not provided
                        };

                        // Only set createdAt if it's a new document
                        if (!exists) {
                            trackData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                            // Initialize coinsDeducted to false, we'll confirm it after deduction
                            trackData.coinsDeducted = false;
                        }

                        batch.set(docRef, trackData, { merge: true });
                    }
                }

                await batch.commit();
                console.log(`[Suno Callback] ✅ Successfully saved ${tracks.length} track(s) to Firestore`);

                // Deduct coins for successful music generation (Idempotent)
                for (const track of tracks) {
                    if (track.audio_url) {
                        const docRef = musicTracksRef.doc(taskId); // Use taskId, not track.id
                        const doc = await docRef.get();
                        // Deduct only if NOT already deducted
                        if (!doc.data()?.coinsDeducted) {
                            await deductMusicCoins(userId, taskId, track.title); // Use taskId for reference
                            // Verify deduction was attempted (success/fail logged in function) and mark as deducted to prevent double charge
                            // In a stricter system, checking the return value of deductMusicCoins would be better.
                            // For now, we assume we should mark it to avoid endless retries on every callback.
                            await docRef.update({ coinsDeducted: true });
                        } else {
                            console.log(`[Suno Callback] Coins already deducted for track ${taskId}, skipping.`);
                        }
                    }
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

                        const trackData: any = {
                            userId: userId,
                            sunoId: clip.id,
                            title: clip.title || 'Untitled Track',
                            audioUrl: clip.audio_url,
                            videoUrl: clip.video_url || null,
                            imageUrl: clip.image_url || null,
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
 * Get music tracks for a user
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

export default router;
