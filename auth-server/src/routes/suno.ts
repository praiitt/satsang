import { Router, Request, Response } from 'express';
import { getDb } from '../firebase.js';
import admin from 'firebase-admin';

const router = Router();

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
                console.log(`[Suno Callback] Processing ${tracks.length} track(s)`);

                const db = getDb();
                const musicTracksRef = db.collection('music_tracks');
                const batch = db.batch();

                for (const track of tracks) {
                    console.log(`[Suno Callback] Processing track: ${track.id} - ${track.title}`);
                    if (track.audio_url) {
                        const docRef = musicTracksRef.doc(track.id);
                        const existingDoc = await docRef.get();
                        const exists = existingDoc.exists;
                        const existingData = exists ? existingDoc.data() : {};

                        const trackData: any = {
                            userId: userId,
                            sunoId: track.id,
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
                        const docRef = musicTracksRef.doc(track.id);
                        const doc = await docRef.get();
                        // Deduct only if NOT already deducted
                        if (!doc.data()?.coinsDeducted) {
                            await deductMusicCoins(userId, track.id, track.title);
                            // Verify deduction was attempted (success/fail logged in function) and mark as deducted to prevent double charge
                            // In a stricter system, checking the return value of deductMusicCoins would be better.
                            // For now, we assume we should mark it to avoid endless retries on every callback.
                            await docRef.update({ coinsDeducted: true });
                        } else {
                            console.log(`[Suno Callback] Coins already deducted for track ${track.id}, skipping.`);
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
                        const docRef = musicTracksRef.doc(clip.id);
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
        const limit = parseInt(query.limit as string) || 10;

        console.log(`[Suno Community Tracks] Parsing params: page=${query.page}, limit=${query.limit}`);
        const offset = (page - 1) * limit;

        const db = getDb();

        // Note: For large collections, offset is inefficient, but fine for now.
        // A better approach would be cursor-based pagination (startAfter).
        // Since we want to sort by creation time, we need an index on createdAt.
        // If index is missing, this might fail or require one.
        // For simplicity and to avoid index requirement errors immediately if not set up,
        // we might fetch a bit more or rely on client-side sorting if volume is low,
        // but let's try standard orderBy first.

        // Query for tracks with audioUrl (completed tracks)
        // Ensure standard query order: orderBy -> offset -> limit
        const tracksQuery = db.collection('music_tracks')
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit);

        // Log the query construction
        console.log(`[Suno Community Tracks] Querying: offset=${offset}, limit=${limit}`);

        // Also get total count (approximate or separate query)
        // Firestore count() aggregation is cost-effective
        const validTracksQuery = db.collection('music_tracks'); // Count all tracks since list query doesn't filter
        const countSnapshot = await validTracksQuery.count().get();
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
            hasMore: page * limit < total
        });
    } catch (error) {
        console.error('[Suno Community Tracks] Error fetching community tracks:', error);
        res.status(500).json({ error: 'Failed to fetch community tracks' });
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
    const trackInfo = result.data?.response || result.data || result;
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
