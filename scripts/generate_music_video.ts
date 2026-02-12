import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(__dirname, '../rraasiServiceAccount.json');

try {
    const serviceAccount = require(serviceAccountPath);
    initializeApp({
        credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized');
} catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    process.exit(1);
}

const db = getFirestore();

async function generateVideo(trackId: string, userId: string, explicitSunoId?: string) {
    if (!trackId || !userId) {
        console.error('Usage: ts-node scripts/generate_music_video.ts <trackId> <userId>');
        process.exit(1);
    }

    console.log(`Generating video for track ${trackId} (User: ${userId})`);

    // 1. Get track data
    const trackRef = db.collection('music_tracks').doc(trackId);
    const trackDoc = await trackRef.get();

    if (!trackDoc.exists) {
        console.error('Track not found!');
        process.exit(1);
    }

    const data = trackDoc.data();
    if (!data) return;

    if (data.userId && data.userId !== userId) {
        console.warn(`Warning: Track user (${data.userId}) does not match provided user (${userId})`);
    }

    const audioId = explicitSunoId || data.sunoId;

    if (!audioId) {
        console.error('Track has no sunoId (audioId) and none provided. Cannot generate video.');
        process.exit(1);
    }

    console.log(`Using Audio ID: ${audioId}`);

    // 2. Call Suno API
    const sunoKey = process.env.SUNO_API_KEY;
    if (!sunoKey) {
        console.error('Missing SUNO_API_KEY in .env.local');
        process.exit(1);
    }

    const callbackUrl = `${process.env.AUTH_SERVER_URL || 'https://rraasi.com'}/api/suno/callback/video`;

    const payload = {
        taskId: trackId, // Use the original generation Task ID (Document ID)
        audioId: audioId,
        callBackUrl: callbackUrl,
        author: "RRAASI Music",
        domainName: "rraasi.com"
    };

    console.log('Calling Suno API with payload:', payload);

    try {
        const response = await fetch('https://api.sunoapi.org/api/v1/mp4/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sunoKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result: any = await response.json();
        console.log('Suno API Response:', result);

        if (response.ok && result.code === 200) {
            console.log('Video generation started successfully!');

            // Update Firestore
            await trackRef.set({
                videoStatus: 'generating',
                videoTaskId: payload.taskId,
                updatedAt: new Date()
            }, { merge: true });

            console.log('Firestore updated with videoStatus: generating');
        } else {
            console.error('Failed to start video generation:', result);
        }

    } catch (error) {
        console.error('Error calling Suno API:', error);
    }
}

// Get args
const args = process.argv.slice(2);
const trackId = args[0];
const userId = args[1];
const sunoId = args[2];

generateVideo(trackId, userId, sunoId)
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
