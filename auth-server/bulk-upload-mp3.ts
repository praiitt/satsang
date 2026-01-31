import { getStorage } from 'firebase-admin/storage';
import { initFirebaseAdmin } from './src/firebase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
initFirebaseAdmin();

const FOLDERS = [
    path.join(__dirname, '../dowloaded_mp3_suno'),
    path.join(__dirname, '../dowloaded_mp3_suno/page5to9'),
    path.join(__dirname, '../dowloaded_mp3_suno/page1to4'),
    path.join(__dirname, '../dowloaded_mp3_suno/last2'),
    path.join(__dirname, '../dowloaded_mp3_suno/missingone')
];

/**
 * Sanitize filename to create a valid storage path
 */
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/\s+/g, '_')  // Replace spaces with underscores
        .replace(/[^\w\-_.]/g, '')  // Remove special characters except -_.
        .toLowerCase();
}

/**
 * Upload a single MP3 file to Firebase Storage
 */
async function uploadMp3(filePath: string, sanitizedName: string): Promise<string> {
    try {
        const buffer = fs.readFileSync(filePath);
        const storagePath = `bulk-upload/${sanitizedName}`;

        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: 'audio/mpeg',
                metadata: {
                    originalFilename: path.basename(filePath),
                    uploadedAt: new Date().toISOString()
                }
            },
            public: true,
        });

        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        return publicUrl;
    } catch (error) {
        throw new Error(`Upload failed: ${error}`);
    }
}

/**
 * Main bulk upload function
 */
async function bulkUploadMp3Files() {
    console.log('\n========================================');
    console.log('🎵 Bulk MP3 Upload to Firebase Storage');
    console.log('========================================\n');

    const allFiles: { folder: string; filename: string; path: string }[] = [];

    // Collect all MP3 files from all folders
    for (const folder of FOLDERS) {
        if (!fs.existsSync(folder)) {
            console.log(`⚠️  Folder not found: ${folder}`);
            continue;
        }

        const files = fs.readdirSync(folder)
            .filter(file => /\.(mp3|wav|m4a|flac)$/i.test(file))
            .map(file => ({
                folder: path.basename(folder),
                filename: file,
                path: path.join(folder, file)
            }));

        allFiles.push(...files);
    }

    if (allFiles.length === 0) {
        console.log('❌ No audio files found in any folder!');
        process.exit(1);
    }

    console.log(`Found ${allFiles.length} audio files to upload\n`);

    const results: {
        originalFilename: string;
        sanitizedFilename: string;
        firebaseUrl: string;
        folder: string;
        status: 'success' | 'failed';
        error?: string;
    }[] = [];

    for (let i = 0; i < allFiles.length; i++) {
        const { folder, filename, path: filePath } = allFiles[i];
        const sanitizedName = sanitizeFilename(filename);

        console.log(`[${i + 1}/${allFiles.length}] 📁 ${filename}`);
        console.log(`  Folder: ${folder}`);
        console.log(`  Uploading as: ${sanitizedName}`);

        try {
            const url = await uploadMp3(filePath, sanitizedName);
            console.log(`  ✅ SUCCESS: ${url.substring(0, 70)}...`);

            results.push({
                originalFilename: filename,
                sanitizedFilename: sanitizedName,
                firebaseUrl: url,
                folder,
                status: 'success'
            });
        } catch (error) {
            console.error(`  ❌ FAILED: ${error}`);
            results.push({
                originalFilename: filename,
                sanitizedFilename: sanitizedName,
                firebaseUrl: '',
                folder,
                status: 'failed',
                error: String(error)
            });
        }

        console.log('');
    }

    // Generate mapping file
    const mappingFile = path.join(__dirname, 'upload-mapping.json');
    fs.writeFileSync(mappingFile, JSON.stringify(results, null, 2));

    // Generate CSV for easier viewing
    const csvFile = path.join(__dirname, 'upload-mapping.csv');
    const csvLines = [
        'Original Filename,Sanitized Filename,Firebase Storage URL,Folder,Status',
        ...results.map(r =>
            `"${r.originalFilename}","${r.sanitizedFilename}","${r.firebaseUrl}","${r.folder}","${r.status}"`
        )
    ];
    fs.writeFileSync(csvFile, csvLines.join('\n'));

    // Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log('\n========================================');
    console.log('📊 Upload Summary');
    console.log('========================================');
    console.log(`✅ Successfully uploaded: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total: ${allFiles.length}`);
    console.log('========================================\n');

    console.log('📝 Mapping files created:');
    console.log(`  - ${mappingFile}`);
    console.log(`  - ${csvFile}`);
    console.log('\nThese files contain the mapping of original filenames to Firebase Storage URLs.');
    console.log('You can use this to update Firestore documents manually or with another script.\n');
}

// Run bulk upload
bulkUploadMp3Files()
    .then(() => {
        console.log('Bulk upload complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Bulk upload failed:', error);
        process.exit(1);
    });
