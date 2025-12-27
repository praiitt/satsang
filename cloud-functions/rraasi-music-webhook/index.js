const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

/**
 * RRAASI Music Webhook - Suno API Callback Handler
 * Receives callbacks from Suno API when music generation completes
 */
functions.http('musicWebhook', async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        const userId = req.query.userId || 'default_user';

        console.log(`[Music Webhook] Received for user: ${userId}`);
        console.log(`[Music Webhook] Payload:`, JSON.stringify(payload, null, 2));

        // Detect payload format (official vs legacy)
        const isOfficialFormat = payload.code !== undefined && payload.data?.callbackType !== undefined;

        let tracksToSave = [];

        if (isOfficialFormat) {
            // Official Suno API format
            console.log(`[Music Webhook] Official format - Code: ${payload.code}, Type: ${payload.data.callbackType}`);

            if (payload.code === 200 &&
                (payload.data.callbackType === 'complete' || payload.data.callbackType === 'first')) {
                tracksToSave = payload.data.data || [];
            }
        } else {
            // Legacy format (backwards compatibility)
            console.log(`[Music Webhook] Legacy format - Status: ${payload.status}`);

            if (payload.status === 'SUCCESS' && payload.clips && payload.clips.length > 0) {
                // Convert legacy format to standard format
                tracksToSave = payload.clips.map(clip => ({
                    id: clip.id,
                    audio_url: clip.audio_url,
                    source_audio_url: clip.audio_url,
                    stream_audio_url: clip.audio_url,
                    image_url: clip.image_url,
                    source_image_url: clip.image_url,
                    title: clip.title,
                    model_name: clip.model_name,
                    prompt: clip.prompt,
                    tags: clip.tags,
                    duration: 0
                }));
            }
        }

        // Save tracks to Firebase
        if (tracksToSave.length > 0) {
            const batch = db.batch();

            for (const track of tracksToSave) {
                if (track.audio_url) {
                    const trackData = {
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
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        isPublic: false
                    };

                    const docRef = db.collection('music_tracks').doc(track.id);
                    batch.set(docRef, trackData, { merge: true });
                    console.log(`[Music Webhook] Queued track for save: ${track.id} - ${track.title}`);
                }
            }

            await batch.commit();
            console.log(`[Music Webhook] ✅ Successfully saved ${tracksToSave.length} track(s) to Firestore`);
        } else {
            console.log(`[Music Webhook] No tracks to save`);
        }

        // Always return 200 to acknowledge receipt (prevents Suno retries)
        res.status(200).json({
            status: 'received',
            processed: tracksToSave.length
        });

    } catch (error) {
        console.error('[Music Webhook] ❌ Error:', error);
        // Still return 200 to prevent retries on our errors
        res.status(200).json({
            status: 'error',
            message: 'Internal processing error'
        });
    }
});
