
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('../rraasiServiceAccount.json');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'rraasi-8a619-music-storage' // Explicit bucket
    });
}

const db = admin.firestore();
const bucket = getStorage().bucket('rraasi-8a619-music-storage');

// Args
const DRY_RUN = process.argv.includes('--dry-run');

async function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download: ${res.statusCode}`));
                return;
            }
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

async function uploadToStorage(buffer, destinationPath, contentType) {
    const file = bucket.file(destinationPath);
    await file.save(buffer, {
        metadata: {
            contentType: contentType,
            metadata: {
                firebaseStorageDownloadTokens: new Date().getTime() // Mock token
            }
        }
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
}

async function migrateTracks() {
    console.log(`🚀 Starting Migration (Dry Run: ${DRY_RUN})\n`);

    // Query all tracks
    const snapshot = await db.collection('music_tracks').get();
    let totalProcessed = 0;
    let totalMigrated = 0;
    let totalErrors = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const taskId = doc.id;
        const tracks = data.tracks || [];

        let docNeedsUpdate = false;
        let updatedTracks = [...tracks];

        // Also check root level fields (backward compatibility)
        // If 'tracks' array is empty but root has audioUrl
        if (tracks.length === 0 && data.audioUrl && (data.audioUrl.includes('suno') || data.audioUrl.includes('cdn') || data.audioUrl.includes('actions.google'))) {
            console.log(`[${taskId}] Found Root Legacy Track: ${data.title}`);
            // We can migrate this too, but usually we focus on the array.
            // Let's implement array migration first as that's the current schema.
        }

        for (let i = 0; i < updatedTracks.length; i++) {
            const track = updatedTracks[i];
            const audioUrl = track.audioUrl;
            const imageUrl = track.imageUrl;

            let trackChanged = false;

            // Check Audio - Update criteria to include 'musicfile' per user request
            if (audioUrl && !audioUrl.includes('storage.googleapis.com') &&
                (audioUrl.includes('suno') || audioUrl.includes('cdn') || audioUrl.includes('actions.google') || audioUrl.includes('audiopipe') || audioUrl.includes('musicfile'))) {
                console.log(`[${taskId}] 🎵 Found External Audio: ${audioUrl}`);

                if (!DRY_RUN) {
                    try {
                        const buffer = await downloadFile(audioUrl);

                        // Better extension extraction
                        let ext = 'mp3';
                        if (audioUrl.includes('.ogg')) ext = 'ogg';
                        else if (audioUrl.includes('.wav')) ext = 'wav';

                        const safeFilename = `${track.sunoId}.${ext}`;

                        const storagePath = `music-tracks/${taskId}/${safeFilename}`;
                        const newUrl = await uploadToStorage(buffer, storagePath, 'audio/mpeg');

                        console.log(`   ✅ Migrated Audio: ${newUrl}`);
                        updatedTracks[i].audioUrl = newUrl;
                        trackChanged = true;
                        totalMigrated++;
                    } catch (e) {
                        console.error(`   ❌ Failed to migrate audio: ${e.message}`);
                        totalErrors++;
                    }
                } else {
                    totalProcessed++;
                }
            }

            // Check Image - Broadened to catch ALL external URLs
            if (imageUrl && !imageUrl.includes('storage.googleapis.com') && imageUrl.startsWith('http')) {
                console.log(`[${taskId}] 🖼️ Found External Image: ${imageUrl}`);

                if (!DRY_RUN) {
                    try {
                        const buffer = await downloadFile(imageUrl);
                        // Extract extension or default to jpg
                        let ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
                        if (ext.length > 4) ext = 'jpg'; // Safety for long query params

                        const safeFilename = `cover.${ext}`;

                        const storagePath = `music-tracks/${taskId}/${safeFilename}`;
                        // mime type guess
                        let mime = 'image/jpeg';
                        if (ext === 'png') mime = 'image/png';
                        if (ext === 'webp') mime = 'image/webp';

                        const newUrl = await uploadToStorage(buffer, storagePath, mime);

                        console.log(`   ✅ Migrated Image: ${newUrl}`);
                        updatedTracks[i].imageUrl = newUrl;
                        trackChanged = true;
                    } catch (e) {
                        console.error(`   ❌ Failed to migrate image: ${e.message}`);
                    }
                }
            }

            if (trackChanged) docNeedsUpdate = true;
        }

        if (docNeedsUpdate && !DRY_RUN) {
            await db.collection('music_tracks').doc(taskId).update({
                tracks: updatedTracks,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[${taskId}] 💾 Document Updated.`);
        }
    }

    console.log(`\nMigration Complete.`);
    console.log(`- Candidates Found: ${totalProcessed}`);
    console.log(`- Assets Migrated: ${totalMigrated}`);
    console.log(`- Errors: ${totalErrors}`);
}

migrateTracks();
