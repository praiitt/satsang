import { getStorage } from 'firebase-admin/storage';
import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';
import admin from 'firebase-admin';
import * as fs from 'fs';

initFirebaseAdmin();

const NEW_COVER_PATH = '/Users/prakash/.gemini/antigravity/brain/8ca483d9-b546-4b38-bc94-354d72571e1d/rraasi_gradient_cover_1769289913176.png';
const OLD_URL = 'https://storage.googleapis.com/rraasi-8a619-music-storage/music-tracks/default-cover.png';

async function uploadAndUpdateToGradient() {
    console.log('\n========================================');
    console.log('🎨 Uploading Gradient & Updating Tracks');
    console.log('========================================\n');

    // Upload with new filename to avoid cache
    console.log('📤 Uploading gradient cover with new filename...\n');
    const buffer = fs.readFileSync(NEW_COVER_PATH);
    const storagePath = 'music-tracks/gradient-cover.png';

    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
        metadata: {
            contentType: 'image/png',
            metadata: {
                purpose: 'gradient-music-cover',
                uploadedAt: new Date().toISOString()
            }
        },
        public: true,
    });

    await file.makePublic();

    const newUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log(`✅ Uploaded gradient cover`);
    console.log(`   New URL: ${newUrl}\n`);

    // Update all tracks using the old URL
    console.log('🔄 Updating all tracks to use new gradient URL...\n');

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
                if (track.imageUrl === OLD_URL) {
                    needsUpdate = true;
                    return { ...track, imageUrl: newUrl };
                }
                return track;
            });

            if (needsUpdate) {
                updates.tracks = updatedTracks;
            }
        }

        // Check old format
        if (data.imageUrl === OLD_URL) {
            needsUpdate = true;
            updates.imageUrl = newUrl;
        }

        if (needsUpdate) {
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            await db.collection('music_tracks').doc(doc.id).update(updates);
            updateCount++;
        }
    }

    console.log(`✅ Updated ${updateCount} tracks to use gradient cover\n`);
    console.log('========================================');
    console.log('✅ Complete!');
    console.log('========================================\n');
}

uploadAndUpdateToGradient().then(() => {
    console.log('Refresh your page - you should see the gradient now!\n');
    process.exit(0);
}).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
