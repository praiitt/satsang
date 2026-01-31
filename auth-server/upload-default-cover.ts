import { getStorage } from 'firebase-admin/storage';
import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initFirebaseAdmin();

const COVER_IMAGE_PATH = '/Users/prakash/.gemini/antigravity/brain/8ca483d9-b546-4b38-bc94-354d72571e1d/rraasi_music_default_cover_1769289803668.png';

function isOldSunoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('musicfile.api.box') ||
        url.includes('cdn.suno.ai') ||
        url.includes('removeai.ai') ||
        (url.includes('http') && !url.includes('storage.googleapis.com'));
}

async function uploadDefaultCover(): Promise<string> {
    console.log('\n📤 Uploading default cover image to Firebase Storage...\n');

    const buffer = fs.readFileSync(COVER_IMAGE_PATH);
    const storagePath = 'music-tracks/default-cover.png';

    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
        metadata: {
            contentType: 'image/png',
            metadata: {
                purpose: 'default-music-cover',
                uploadedAt: new Date().toISOString()
            }
        },
        public: true,
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log(`✅ Uploaded default cover image`);
    console.log(`   URL: ${publicUrl}\n`);

    return publicUrl;
}

async function updateBrokenImageUrls(defaultImageUrl: string) {
    console.log('========================================');
    console.log('🔄 Updating Broken Image URLs');
    console.log('========================================\n');

    const db = getDb();
    const snapshot = await db.collection('music_tracks').get();

    let updateCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsUpdate = false;
        let updates: any = {};

        // Check tracks array format
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            const updatedTracks = data.tracks.map((track: any) => {
                if (isOldSunoUrl(track.imageUrl) || !track.imageUrl) {
                    needsUpdate = true;
                    return { ...track, imageUrl: defaultImageUrl };
                }
                return track;
            });

            if (needsUpdate) {
                updates.tracks = updatedTracks;
            }
        }

        // Check old format
        if (isOldSunoUrl(data.imageUrl) || !data.imageUrl) {
            needsUpdate = true;
            updates.imageUrl = defaultImageUrl;
        }

        if (needsUpdate) {
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            await db.collection('music_tracks').doc(doc.id).update(updates);
            updateCount++;

            const title = data.title || 'Untitled';
            console.log(`✅ Updated: "${title}" (${doc.id})`);
        }
    }

    console.log('\n========================================');
    console.log('📊 Update Summary');
    console.log('========================================');
    console.log(`✅ Updated: ${updateCount} tracks`);
    console.log(`🖼️ All now using: ${defaultImageUrl}`);
    console.log('========================================\n');
}

async function main() {
    console.log('\n========================================');
    console.log('🎨 Default Music Cover Setup');
    console.log('========================================\n');

    // Upload default cover
    const defaultImageUrl = await uploadDefaultCover();

    // Update all broken image URLs
    await updateBrokenImageUrls(defaultImageUrl);

    console.log('✅ All done! Your music tracks now have beautiful cover images!\n');
}

main().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
