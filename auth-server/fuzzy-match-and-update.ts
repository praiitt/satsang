import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
initFirebaseAdmin();

/**
 * Load upload mapping from JSON file
 */
function loadUploadMapping(): { originalFilename: string; firebaseUrl: string }[] {
    const mappingFile = path.join(__dirname, 'upload-mapping.json');
    const data = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
    return data.map((item: any) => ({
        originalFilename: item.originalFilename,
        firebaseUrl: item.firebaseUrl
    }));
}

/**
 * Normalize string for fuzzy matching
 * Removes special chars, spaces, numbers, makes lowercase
 */
function normalizeForMatching(str: string): string {
    return str
        .toLowerCase()
        .replace(/\(.*?\)/g, '') // Remove anything in parentheses
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\d+/g, '') // Remove numbers
        .replace(/\s+/g, ' ') // Normalize spacing
        .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 * Higher score = more similar
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeForMatching(str1);
    const s2 = normalizeForMatching(str2);

    if (s1 === s2) return 1.0;

    // Check if one string contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
        const shorter = Math.min(s1.length, s2.length);
        const longer = Math.max(s1.length, s2.length);
        return shorter / longer * 0.9; // 0.9 multiplier for partial match
    }

    // Calculate word overlap
    const words1 = s1.split(' ').filter(w => w.length > 2);
    const words2 = s2.split(' ').filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(w => words2.includes(w)).length;
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords / totalWords;
}

/**
 * Find best matching upload for a Firestore track
 */
function findBestMatch(
    trackTitle: string,
    uploads: { originalFilename: string; firebaseUrl: string }[]
): { match: { originalFilename: string; firebaseUrl: string }; score: number } | null {

    let bestMatch = null;
    let bestScore = 0;

    for (const upload of uploads) {
        const filename = upload.originalFilename.replace(/\.(mp3|wav|m4a|flac)$/i, '');
        const score = calculateSimilarity(trackTitle, filename);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = upload;
        }
    }

    // Only return matches with score > 0.5 (50% similarity)
    if (bestScore >= 0.5) {
        return { match: bestMatch!, score: bestScore };
    }

    return null;
}

/**
 * Check if URL is an old Suno CDN URL
 */
function isOldSunoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('musicfile.api.box') ||
        url.includes('cdn.suno.ai') ||
        (url.includes('http') && !url.includes('storage.googleapis.com'));
}

/**
 * Update a single track in Firestore
 */
async function updateTrackUrl(docId: string, data: any, newAudioUrl: string): Promise<void> {
    const db = getDb();
    const docRef = db.collection('music_tracks').doc(docId);

    // Check if using new tracks array format
    if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
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
}

/**
 * Main fuzzy matching and update function
 */
async function fuzzyMatchAndUpdate() {
    console.log('\n========================================');
    console.log('🎯 Fuzzy Matching & Firestore Update');
    console.log('========================================\n');

    // Load upload mapping
    console.log('📂 Loading upload mapping...');
    const uploads = loadUploadMapping();
    console.log(`   Found ${uploads.length} uploaded files\n`);

    // Get all Firestore tracks
    console.log('🔍 Fetching Firestore tracks...');
    const db = getDb();
    const snapshot = await db.collection('music_tracks').get();
    console.log(`   Found ${snapshot.size} total tracks\n`);

    // Filter tracks with old URLs
    const tracksToUpdate: { id: string; title: string; data: any }[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = data.title || doc.id;

        let hasOldUrl = false;

        // Check tracks array format
        if (data.tracks && Array.isArray(data.tracks)) {
            for (const track of data.tracks) {
                if (isOldSunoUrl(track.audioUrl)) {
                    hasOldUrl = true;
                    break;
                }
            }
        }

        // Check old format
        if (isOldSunoUrl(data.audioUrl)) {
            hasOldUrl = true;
        }

        if (hasOldUrl) {
            tracksToUpdate.push({ id: doc.id, title, data });
        }
    }

    console.log(`📋 Found ${tracksToUpdate.length} tracks with old URLs\n`);

    if (tracksToUpdate.length === 0) {
        console.log('✅ No tracks need updating!\n');
        return;
    }

    console.log('========================================');
    console.log('🚀 Matching and Updating');
    console.log('========================================\n');

    let successCount = 0;
    let skippedCount = 0;
    const unmatchedTracks: string[] = [];

    for (let i = 0; i < tracksToUpdate.length; i++) {
        const { id, title, data } = tracksToUpdate[i];

        console.log(`\n[${i + 1}/${tracksToUpdate.length}] 🎵 ${title}`);
        console.log(`  ID: ${id}`);

        const result = findBestMatch(title, uploads);

        if (result) {
            console.log(`  ✅ Match found: "${result.match.originalFilename}"`);
            console.log(`     Similarity: ${(result.score * 100).toFixed(1)}%`);
            console.log(`     URL: ${result.match.firebaseUrl.substring(0, 70)}...`);

            try {
                await updateTrackUrl(id, data, result.match.firebaseUrl);
                console.log(`  ✅ Updated in Firestore`);
                successCount++;
            } catch (error) {
                console.error(`  ❌ Failed to update: ${error}`);
            }
        } else {
            console.log(`  ⚠️  No match found (similarity < 50%)`);
            unmatchedTracks.push(title);
            skippedCount++;
        }
    }

    console.log('\n========================================');
    console.log('📊 Update Summary');
    console.log('========================================');
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⚠️  No match found: ${skippedCount}`);
    console.log(`📁 Total processed: ${tracksToUpdate.length}`);
    console.log('========================================\n');

    if (unmatchedTracks.length > 0) {
        console.log('⚠️  Unmatched Tracks:');
        unmatchedTracks.forEach((track, i) => {
            console.log(`  ${i + 1}. ${track}`);
        });
        console.log('\nThese tracks may need manual URL updates.\n');
    }
}

// Run fuzzy matching
fuzzyMatchAndUpdate()
    .then(() => {
        console.log('Fuzzy matching complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fuzzy matching failed:', error);
        process.exit(1);
    });
