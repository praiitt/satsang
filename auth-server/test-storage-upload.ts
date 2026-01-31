import { getStorage } from 'firebase-admin/storage';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'rraasiServiceAccount.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    storageBucket: 'rraasi-8a619-music-storage'
});

/**
 * Test the downloadAndStoreAudio function
 */
async function downloadAndStoreAudio(audioUrl: string, trackId: string): Promise<string> {
    try {
        console.log(`[Test] Downloading audio from: ${audioUrl}`);

        // Download the audio file
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`[Test] Downloaded ${buffer.length} bytes`);

        // Extract filename from URL or use a default
        const urlPath = new URL(audioUrl).pathname;
        const originalFilename = urlPath.split('/').pop() || 'audio.mp3';

        // Determine file extension (default to .mp3 if not found)
        const ext = originalFilename.includes('.')
            ? originalFilename.substring(originalFilename.lastIndexOf('.'))
            : '.mp3';

        const filename = `${trackId}${ext}`;
        const storagePath = `music-tracks/${trackId}/${filename}`;

        console.log(`[Test] Uploading to: ${storagePath}`);

        // Get Firebase Storage bucket
        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);

        // Upload the file
        await file.save(buffer, {
            metadata: {
                contentType: 'audio/mpeg',
                metadata: {
                    firebaseStorageDownloadTokens: admin.firestore.FieldValue.serverTimestamp()
                }
            },
            public: true, // Make file publicly accessible
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`[Test] ✅ Uploaded successfully: ${publicUrl}`);
        return publicUrl;

    } catch (error) {
        console.error(`[Test] ❌ Error downloading/uploading audio:`, error);
        throw error;
    }
}

/**
 * Run the test
 */
async function runTest() {
    console.log('\n========================================');
    console.log('Testing Firebase Storage Upload');
    console.log('========================================\n');

    // Use a sample audio file URL (a short, free test audio file)
    const testAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    const testTrackId = `test_${Date.now()}`;

    console.log(`Test Track ID: ${testTrackId}`);
    console.log(`Test Audio URL: ${testAudioUrl}\n`);

    try {
        const permanentUrl = await downloadAndStoreAudio(testAudioUrl, testTrackId);

        console.log('\n✅ TEST PASSED!');
        console.log(`Permanent URL: ${permanentUrl}`);
        console.log('\nYou can verify the upload at:');
        console.log(`https://console.firebase.google.com/project/rraasi-8a619/storage/rraasi-8a619.appspot.com/files/~2Fmusic-tracks~2F${testTrackId}`);

        // Try to fetch the uploaded file to verify it's accessible
        console.log('\nVerifying file is publicly accessible...');
        const verifyResponse = await fetch(permanentUrl);
        if (verifyResponse.ok) {
            console.log('✅ File is publicly accessible!');
            console.log(`File size: ${verifyResponse.headers.get('content-length')} bytes`);
            console.log(`Content type: ${verifyResponse.headers.get('content-type')}`);
        } else {
            console.log('❌ File is NOT publicly accessible');
            console.log(`Status: ${verifyResponse.status} ${verifyResponse.statusText}`);
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED!');
        console.error(error);
        process.exit(1);
    }

    console.log('\n========================================\n');
}

// Run the test
runTest().then(() => {
    console.log('Test complete!');
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
