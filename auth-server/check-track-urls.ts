import { getDb } from './src/firebase.js';
import { getStorage } from 'firebase-admin/storage';
import { initFirebaseAdmin } from './src/firebase.js';

initFirebaseAdmin();

async function checkTrackUrls() {
    const db = getDb();

    // Check specific tracks
    const tracksToCheck = [
        'Joyful Radiance',
        'Serene Resettling Journey',
        'Awakening Energy',
        'Divine Vibrations'
    ];

    console.log('\n========================================');
    console.log('🔍 Checking Track URLs');
    console.log('========================================\n');

    const snapshot = await db.collection('music_tracks').get();

    for (const trackName of tracksToCheck) {
        console.log(`\n📁 Searching for: "${trackName}"`);

        let found = false;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.title && data.title.includes(trackName)) {
                found = true;
                const audioUrl = data.audioUrl || data.tracks?.[0]?.audioUrl || 'NO URL';

                console.log(`  ✅ Found: ${data.title}`);
                console.log(`  ID: ${doc.id}`);
                console.log(`  URL: ${audioUrl}`);

                // Check if URL is accessible
                if (audioUrl.includes('storage.googleapis.com')) {
                    try {
                        const response = await fetch(audioUrl, { method: 'HEAD' });
                        if (response.ok) {
                            console.log(`  ✅ File is accessible (${response.status})`);
                        } else {
                            console.log(`  ❌ File NOT accessible (${response.status})`);
                        }
                    } catch (error) {
                        console.log(`  ❌ Error checking file: ${error}`);
                    }
                } else if (audioUrl.includes('musicfile.api.box')) {
                    console.log(`  ⚠️  Still using old Suno CDN URL (expired)`);
                } else {
                    console.log(`  ⚠️  Unknown URL format`);
                }
            }
        }

        if (!found) {
            console.log(`  ⚠️  Track not found in Firestore`);
        }
    }

    // List all files in bulk-upload folder
    console.log('\n\n========================================');
    console.log('📦 Files in Firebase Storage (bulk-upload/)');
    console.log('========================================\n');

    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'bulk-upload/' });

    console.log(`Found ${files.length} files in storage:\n`);

    const fileNames = files.slice(0, 20).map(f => f.name);
    fileNames.forEach((name, i) => {
        console.log(`${i + 1}. ${name}`);
    });

    if (files.length > 20) {
        console.log(`... and ${files.length - 20} more files`);
    }
}

checkTrackUrls().then(() => {
    console.log('\n\nCheck complete!\n');
    process.exit(0);
});
