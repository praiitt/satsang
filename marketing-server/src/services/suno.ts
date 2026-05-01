import { getDb } from '../firebase.js';
import admin from 'firebase-admin';
import axios from 'axios';

interface GenerateTrackParams {
    firebaseUid: string;
    prompt: string;
    title?: string;
    metadata?: {
        intention?: string;
        mood?: string;
        genre?: string;
    }
}

/**
 * Triggers Suno music generation and registers the pending track in Firestore.
 */
export async function generateSunoTrack(params: GenerateTrackParams): Promise<string> {
    const SUNO_API_KEY = process.env.SUNO_API_KEY;
    if (!SUNO_API_KEY) throw new Error('SUNO_API_KEY not configured in environment');

    // Use a publicly accessible URL if we are testing locally (e.g. ngrok via AUTH_SERVER_URL).
    // Fall back to production only if explicitly missing.
    const baseUrl = process.env.AUTH_SERVER_URL || process.env.AUTH_SERVER_URL_INTERNAL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app';
    const callbackUrl = `${baseUrl}/suno/callback`;

    console.log(`[suno-service] Initiating generation for UID: ${params.firebaseUid}, Prompt length: ${params.prompt.length}`);

    // Generate via Suno API
    const sunoRes = await fetch('https://api.sunoapi.org/api/v1/generate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${SUNO_API_KEY}` 
        },
        body: JSON.stringify({
            prompt: params.prompt,
            customMode: false,
            instrumental: false,
            model: 'V3_5',
            callbackUrl: callbackUrl
        })
    });

    const sunoData = await sunoRes.json() as any;
    if (!sunoRes.ok) {
        console.error('[suno-service] Generation API failed:', sunoData);
        throw new Error(`Suno generation failed: ${JSON.stringify(sunoData)}`);
    }

    const taskId = sunoData?.data?.taskId || sunoData?.data?.task_id || sunoData?.task_id || sunoData?.taskId;
    if (!taskId) {
        throw new Error('No taskId returned from Suno API');
    }

    // Register the task in Firestore so auth-server callback can process it correctly
    // Match the schema conventions of music_agent.py and the auth-server webhook
    const db = getDb();
    await db.collection('music_tracks').doc(taskId).set({
        userId: params.firebaseUid,
        taskId: taskId,
        status: 'PENDING',
        title: params.title || 'Conversational Track',
        prompt: params.prompt,
        category: 'rraasi-music',
        isPublic: false,
        metadata: params.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`[suno-service] Successfully queued taskId: ${taskId} for UID: ${params.firebaseUid}`);
    return taskId;
}
