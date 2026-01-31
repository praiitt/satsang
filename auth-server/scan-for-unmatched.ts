import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '../dowloaded_mp3_suno');

// Unmatched tracks from the last run
const unmatchedTracks = [
    'Divine Healing Waves',
    'Mehboob ki Aankhein',
    'Chakra Vibrations – Full Spectrum Activation',
    'Anahata Harmony',
    'Wo Mile To',
    'Patni ji',
    'tu kya hai',
    'Sacred Crown Resonance',
    'Milan',
    'Open Heart Vibration'
];

/**
 * Recursively find all MP3 files
 */
function findAllMp3Files(dir: string): string[] {
    const results: string[] = [];

    try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                results.push(...findAllMp3Files(fullPath));
            } else if (/\.(mp3|wav|m4a|flac)$/i.test(item)) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error scanning ${dir}:`, error);
    }

    return results;
}

/**
 * Normalize for matching
 */
function normalize(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check if filename matches any unmatched track
 */
function checkForMatches() {
    console.log('\n========================================');
    console.log('🔍 Scanning for Unmatched Tracks');
    console.log('========================================\n');

    console.log(`Base directory: ${BASE_DIR}\n`);

    const allFiles = findAllMp3Files(BASE_DIR);

    console.log(`Found ${allFiles.length} total MP3 files\n`);

    console.log('========================================');
    console.log('Looking for unmatched tracks:');
    console.log('========================================\n');

    const foundMatches: { track: string; file: string }[] = [];
    const notFound: string[] = [];

    for (const track of unmatchedTracks) {
        const normalizedTrack = normalize(track);
        let found = false;

        for (const file of allFiles) {
            const filename = path.basename(file).replace(/\.(mp3|wav|m4a|flac)$/i, '');
            const normalizedFilename = normalize(filename);

            // Check for exact or very close match
            if (normalizedFilename.includes(normalizedTrack) ||
                normalizedTrack.includes(normalizedFilename) ||
                normalizedFilename === normalizedTrack) {

                const relativePath = path.relative(BASE_DIR, file);
                console.log(`✅ "${track}"`);
                console.log(`   Found: ${relativePath}\n`);

                foundMatches.push({ track, file: relativePath });
                found = true;
                break;
            }
        }

        if (!found) {
            console.log(`❌ "${track}"`);
            console.log(`   NOT FOUND\n`);
            notFound.push(track);
        }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`✅ Found: ${foundMatches.length}`);
    console.log(`❌ Not found: ${notFound.length}`);
    console.log(`📁 Total tracks searched: ${unmatchedTracks.length}`);
    console.log('========================================\n');

    if (notFound.length > 0) {
        console.log('⚠️  Tracks NOT in your download folder:');
        notFound.forEach((track, i) => {
            console.log(`  ${i + 1}. ${track}`);
        });
        console.log('\nThese tracks may need to be:');
        console.log('  - Downloaded from another source');
        console.log('  - Regenerated through RRAASI Music');
        console.log('  - Manually mapped to existing files\n');
    }
}

checkForMatches();
