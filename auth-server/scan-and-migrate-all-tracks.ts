import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { getDb } from './src/firebase.js';

// Initialize Firebase Admin
import { initFirebaseAdmin } from './src/firebase.js';
initFirebaseAdmin();

/**
 * Download file from URL and upload to Firebase Storage
 */
async function downloadAndUploadToStorage(
    url: string,
    trackId: string,
    type: 'audio' | 'image'
): Promise<string> {
    try {
        console.log(`    [Download] Fetching from ${url.substring(0, 60)}...`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`    [Download] ✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

        // Determine file extension and content type
        let ext = '.mp3';
        let contentType = 'audio/mpeg';
        let filename = `${trackId}${ext}`;

        if (type === 'image') {
            ext = '.jpg';
            contentType = 'image/jpeg';
            filename = `cover${ext}`;

            // Try to determine actual image type from URL or content
            if (url.includes('.png')) {
                ext = '.png';
                contentType = 'image/png';
                filename = `cover${ext}`;
            } else if (url.includes('.webp')) {
                ext = '.webp';
                contentType = 'image/webp';
                filename = `cover${ext}`;
            }
        }

        const storagePath = `music-tracks/${trackId}/${filename}`;

        console.log(`    [Upload] Uploading to: ${storagePath}`);

        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                    migratedFrom: 'suno-cdn',
                    migrationDate: new Date().toISOString()
                }
            },
            public: true,
        });

        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        console.log(`    [Upload] ✅ Uploaded: ${filename}`);

        return publicUrl;
    } catch (error) {
        console.error(`    [Error] ❌ Failed: ${error}`);
        throw error;
    }
}

/**
 * Check if URL is an old Suno CDN URL that needs migration
 */
function isOldSunoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('musicfile.api.box') ||
        url.includes('cdn.suno.ai') ||
        url.includes('suno.com') ||
        (url.includes('http') && !url.includes('storage.googleapis.com'));
}

/**
 * Migrate a single track
 */
async function migrateTrack(docId: string, data: any): Promise<boolean> {
    try {
        const db = getDb();
        const docRef = db.collection('music_tracks').doc(docId);
        let updated = false;

        // Check if using new tracks array format
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            const updatedTracks = [];

            for (let i = 0; i < data.tracks.length; i++) {
                const track = data.tracks[i];
                const newTrack = { ...track };

                // Migrate audio URL
                if (isOldSunoUrl(track.audioUrl)) {
                    console.log(`    [Audio] Old URL detected, migrating...`);
                    try {
                        newTrack.audioUrl = await downloadAndUploadToStorage(track.audioUrl, docId, 'audio');
                        updated = true;
                    } catch (error) {
                        console.error(`    [Audio] Failed to migrate, keeping old URL`);
                    }
                }

                // Migrate image URL
                if (isOldSunoUrl(track.imageUrl)) {
                    console.log(`    [Image] Old URL detected, migrating...`);
                    try {
                        newTrack.imageUrl = await downloadAndUploadToStorage(track.imageUrl, docId, 'image');
                        updated = true;
                    } catch (error) {
                        console.error(`    [Image] Failed to migrate, keeping old URL`);
                    }
                }

                updatedTracks.push(newTrack);
            }

            if (updated) {
                await docRef.update({
                    tracks: updatedTracks,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    migratedToStorage: true
                });
            }
        } else {
            // Old format with root-level audioUrl and imageUrl
            const updates: any = {};

            // Migrate audio URL
            if (isOldSunoUrl(data.audioUrl)) {
                console.log(`    [Audio] Old URL detected, migrating...`);
                try {
                    updates.audioUrl = await downloadAndUploadToStorage(data.audioUrl, docId, 'audio');
                    updated = true;
                } catch (error) {
                    console.error(`    [Audio] Failed to migrate, keeping old URL`);
                }
            }

            // Migrate image URL
            if (isOldSunoUrl(data.imageUrl)) {
                console.log(`    [Image] Old URL detected, migrating...`);
                try {
                    updates.imageUrl = await downloadAndUploadToStorage(data.imageUrl, docId, 'image');
                    updated = true;
                } catch (error) {
                    console.error(`    [Image] Failed to migrate, keeping old URL`);
                }
            }

            if (updated) {
                updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
                updates.migratedToStorage = true;
                await docRef.update(updates);
            }
        }

        return updated;
    } catch (error) {
        console.error(`    [Error] Migration failed: ${error}`);
        return false;
    }
}

/**
 * Main function to scan and migrate all tracks
 */
async function scanAndMigrateAllTracks() {
    console.log('\n========================================');
    console.log('🔄 Scanning and Migrating Music Tracks');
    console.log('========================================\n');

    const db = getDb();
    const snapshot = await db.collection('music_tracks').get();

    console.log(`Found ${snapshot.size} total tracks in Firestore\n`);

    const tracksWithOldUrls: { id: string; title: string; data: any }[] = [];

    // First pass: identify tracks with old URLs
    console.log('🔍 Scanning for tracks with old CDN URLs...\n');

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = data.title || doc.id;

        let hasOldUrl = false;

        // Check tracks array format
        if (data.tracks && Array.isArray(data.tracks)) {
            for (const track of data.tracks) {
                if (isOldSunoUrl(track.audioUrl) || isOldSunoUrl(track.imageUrl)) {
                    hasOldUrl = true;
                    break;
                }
            }
        }

        // Check old format
        if (isOldSunoUrl(data.audioUrl) || isOldSunoUrl(data.imageUrl)) {
            hasOldUrl = true;
        }

        if (hasOldUrl) {
            tracksWithOldUrls.push({ id: doc.id, title, data });
        }
    }

    console.log(`Found ${tracksWithOldUrls.length} tracks with old CDN URLs\n`);

    if (tracksWithOldUrls.length === 0) {
        console.log('✅ All tracks are already using Firebase Storage!\n');
        return;
    }

    console.log('========================================');
    console.log('🚀 Starting Migration');
    console.log('========================================\n');

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < tracksWithOldUrls.length; i++) {
        const { id, title, data } = tracksWithOldUrls[i];

        console.log(`\n[${i + 1}/${tracksWithOldUrls.length}] 🎵 ${title}`);
        console.log(`  ID: ${id}`);

        try {
            const wasUpdated = await migrateTrack(id, data);

            if (wasUpdated) {
                console.log(`  ✅ SUCCESS - Migrated to Firebase Storage`);
                successCount++;
            } else {
                console.log(`  ⏭️  SKIPPED - No updates needed`);
                skippedCount++;
            }
        } catch (error) {
            console.error(`  ❌ FAILED: ${error}`);
            failCount++;
        }
    }

    console.log('\n========================================');
    console.log('📊 Migration Summary');
    console.log('========================================');
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total processed: ${tracksWithOldUrls.length}`);
    console.log('========================================\n');
}

// Run the scan and migration
scanAndMigrateAllTracks()
    .then(() => {
        console.log('Migration complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
