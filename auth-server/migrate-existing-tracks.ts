import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { getDb } from './src/firebase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
import { initFirebaseAdmin } from './src/firebase.js';
initFirebaseAdmin();

const MP3_FOLDER = path.join(__dirname, '../dowloaded_mp3_suno');

/**
 * Upload an MP3 file to Firebase Storage
 */
async function uploadMp3ToStorage(filePath: string, trackId: string): Promise<string> {
    try {
        const fileName = path.basename(filePath);
        console.log(`  [Upload] ${fileName}...`);

        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath) || '.mp3';
        const filename = `${trackId}${ext}`;
        const storagePath = `music-tracks/${trackId}/${filename}`;

        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: 'audio/mpeg',
                metadata: {
                    migratedFrom: 'dowloaded_mp3_suno',
                    originalFilename: fileName
                }
            },
            public: true,
        });

        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        console.log(`  [Upload] ✅ Uploaded to: ${storagePath}`);

        return publicUrl;
    } catch (error) {
        console.error(`  [Upload] ❌ Failed:`, error);
        throw error;
    }
}

/**
 * Update Firestore music_tracks with new audioUrl
 */
async function updateFirestoreAudioUrl(trackId: string, newAudioUrl: string): Promise<void> {
    try {
        const db = getDb();
        const docRef = db.collection('music_tracks').doc(trackId);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log(`  [Firestore] ⚠️  Document not found`);
            return;
        }

        const data = doc.data();

        // Update based on data structure
        if (data?.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            // New format with tracks array - update first track
            const updatedTracks = data.tracks.map((track: any, index: number) => {
                if (index === 0) {
                    return { ...track, audioUrl: newAudioUrl };
                }
                return track;
            });

            await docRef.update({
                tracks: updatedTracks,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                migratedToStorage: true
            });
        } else {
            // Old format with root-level audioUrl
            await docRef.update({
                audioUrl: newAudioUrl,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                migratedToStorage: true
            });
        }

        console.log(`  [Firestore] ✅ Updated audioUrl`);
    } catch (error) {
        console.error(`  [Firestore] ❌ Failed:`, error);
        throw error;
    }
}

/**
 * Normalize title for comparison (remove special chars, spaces, lowercase)
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, '') // Remove whitespace
        .trim();
}

/**
 * Find Firestore document by matching title
 */
async function findTrackByTitle(filename: string): Promise<{ id: string; title: string; currentUrl: string } | null> {
    try {
        // Remove extension and " (1)" duplicates
        const titleFromFile = filename
            .replace(/\.(mp3|wav|m4a|flac)$/i, '')
            .replace(/\s*\(\d+\)$/, '') // Remove (1), (2) etc
            .trim();

        const normalizedFileTitle = normalizeTitle(titleFromFile);

        const db = getDb();
        const snapshot = await db.collection('music_tracks')
            .where('status', '==', 'COMPLETED')
            .get();

        // Try exact match first
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const docTitle = data.title || '';

            if (normalizeTitle(docTitle) === normalizedFileTitle) {
                const currentUrl = data.audioUrl || data.tracks?.[0]?.audioUrl || '';
                return {
                    id: doc.id,
                    title: docTitle,
                    currentUrl: currentUrl
                };
            }
        }

        // Try partial match
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const docTitle = data.title || '';
            const normalizedDocTitle = normalizeTitle(docTitle);

            if (normalizedDocTitle.includes(normalizedFileTitle) ||
                normalizedFileTitle.includes(normalizedDocTitle)) {
                const currentUrl = data.audioUrl || data.tracks?.[0]?.audioUrl || '';
                return {
                    id: doc.id,
                    title: docTitle,
                    currentUrl: currentUrl
                };
            }
        }

        return null;
    } catch (error) {
        console.error(`Error finding track by title:`, error);
        return null;
    }
}

/**
 * Main migration function
 */
async function migrateExistingTracks() {
    console.log('\n========================================');
    console.log('🎵 Music Tracks Migration to Firebase Storage');
    console.log('========================================\n');

    if (!fs.existsSync(MP3_FOLDER)) {
        console.error(`❌ Folder not found: ${MP3_FOLDER}`);
        console.log('Please create the folder and add MP3 files to migrate.');
        process.exit(1);
    }

    const files = fs.readdirSync(MP3_FOLDER)
        .filter(file => /\.(mp3|wav|m4a|flac)$/i.test(file))
        .sort();

    if (files.length === 0) {
        console.log('ℹ️  No audio files found in the folder.');
        console.log(`Folder: ${MP3_FOLDER}`);
        process.exit(0);
    }

    console.log(`Found ${files.length} audio file(s) to migrate\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const results: { filename: string; status: string; message: string }[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(MP3_FOLDER, file);

        console.log(`\n[${i + 1}/${files.length}] 📁 ${file}`);

        try {
            // Find matching Firestore document
            console.log(`  [Search] Looking for matching track in Firestore...`);
            const match = await findTrackByTitle(file);

            if (!match) {
                console.log(`  [Search] ⚠️  No matching track found - SKIPPING`);
                skippedCount++;
                results.push({ filename: file, status: 'SKIPPED', message: 'No matching Firestore document' });
                continue;
            }

            console.log(`  [Search] ✅ Found: "${match.title}" (ID: ${match.id})`);

            // Check if already migrated
            if (match.currentUrl.includes('storage.googleapis.com')) {
                console.log(`  [Check] ⏭️  Already migrated - SKIPPING`);
                skippedCount++;
                results.push({ filename: file, status: 'SKIPPED', message: 'Already using Firebase Storage' });
                continue;
            }

            // Upload to Firebase Storage
            const newAudioUrl = await uploadMp3ToStorage(filePath, match.id);

            // Update Firestore
            await updateFirestoreAudioUrl(match.id, newAudioUrl);

            console.log(`  ✅ SUCCESS`);
            successCount++;
            results.push({ filename: file, status: 'SUCCESS', message: `Migrated as ${match.id}` });

        } catch (error) {
            console.error(`  ❌ FAILED: ${error}`);
            failCount++;
            results.push({ filename: file, status: 'FAILED', message: String(error) });
        }
    }

    console.log('\n========================================');
    console.log('📊 Migration Summary');
    console.log('========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total: ${files.length}`);
    console.log('========================================\n');

    // Show detailed results
    if (skippedCount > 0) {
        console.log('\n📋 Skipped Files:');
        results.filter(r => r.status === 'SKIPPED').forEach(r => {
            console.log(`  - ${r.filename}: ${r.message}`);
        });
    }

    if (failCount > 0) {
        console.log('\n❌ Failed Files:');
        results.filter(r => r.status === 'FAILED').forEach(r => {
            console.log(`  - ${r.filename}: ${r.message}`);
        });
    }

    console.log('');
}

// Run migration
migrateExistingTracks()
    .then(() => {
        console.log('Migration script finished.\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
