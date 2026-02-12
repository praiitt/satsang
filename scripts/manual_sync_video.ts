import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function syncVideo(videoTaskId: string) {
    const sunoKey = process.env.SUNO_API_KEY;
    if (!sunoKey) {
        console.error('Missing SUNO_API_KEY');
        process.exit(1);
    }

    console.log(`Checking video status for taskId: ${videoTaskId}`);

    // Check using BOTH potential endpoints just in case
    const url = `https://api.sunoapi.org/api/v1/mp4/record-info?taskId=${videoTaskId}`;
    let videoUrl: string | null = null;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${sunoKey}` }
        });

        const result: any = await response.json();
        console.log('Suno Status Check:', JSON.stringify(result, null, 2));

        if (result.code === 200 && result.data) {
            videoUrl = result.data.response?.videoUrl || result.data.videoUrl;
        }

        if (videoUrl) {
            console.log(`✅ Video found! URL: ${videoUrl}`);
            console.log('🔄 Simulating callback to LOCAL backend...');

            // Call our local backend callback to trigger storage upload and DB update
            // Using localhost:4000 where auth-server runs
            // Note: Use /suno/callback/video directly as routes are mounted at /suno
            const callbackUrl = 'http://localhost:4000/suno/callback/video';

            const callbackPayload = {
                code: 200,
                data: {
                    task_id: videoTaskId, // Pass the ID used to find it
                    video_url: videoUrl
                }
            };

            console.log('Sending payload:', callbackPayload);

            const cbResponse = await fetch(callbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(callbackPayload)
            });

            const cbResult = await cbResponse.json();
            console.log('Backend Callback Response:', cbResult);
            console.log('✅ Sync complete! Video should now be in Storage and Firestore.');
        } else {
            console.log('❌ Status is present but no videoUrl found. Is it still generating?');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

const id = process.argv[2];

if (!id) {
    console.error('Usage: npx tsx scripts/manual_sync_video.ts <videoTaskId>');
    console.error('Note: Use the VIDEO task ID found in your dashboard/console (e.g. 398a...)');
    process.exit(1);
}

syncVideo(id);
