import { getStorage } from 'firebase-admin/storage';
import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';
import admin from 'firebase-admin';
import * as fs from 'fs';

initFirebaseAdmin();

const NEW_COVER_PATH = '/Users/prakash/.gemini/antigravity/brain/8ca483d9-b546-4b38-bc94-354d72571e1d/rraasi_gradient_cover_1769289913176.png';

async function replaceDefaultCover() {
    console.log('\n========================================');
    console.log('🎨 Replacing with Gradient Cover');
    console.log('========================================\n');

    // Upload new gradient cover
    console.log('📤 Uploading new gradient cover...\n');
    const buffer = fs.readFileSync(NEW_COVER_PATH);
    const storagePath = 'music-tracks/default-cover.png';

    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
        metadata: {
            contentType: 'image/png',
            metadata: {
                purpose: 'default-music-cover-gradient',
                uploadedAt: new Date().toISOString()
            }
        },
        public: true,
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log(`✅ Uploaded bold gradient cover`);
    console.log(`   URL: ${publicUrl}\n`);
    console.log('✅ All tracks using this URL will now show the gradient!\n');
}

replaceDefaultCover().then(() => {
    console.log('Done! Refresh your music page to see the new gradient cover.\n');
    process.exit(0);
}).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
