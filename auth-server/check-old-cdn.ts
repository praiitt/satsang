import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';

initFirebaseAdmin();

function isOldSunoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('musicfile.api.box') ||
        url.includes('cdn.suno.ai') ||
        url.includes('removeai.ai');
}

async function checkForOldCdnUrls() {
    console.log('\n========================================');
    console.log('🔍 Checking for Old Suno CDN URLs');
    console.log('========================================\n');

    const db = getDb();
    const snapshot = await db.collection('music_tracks').get();

    const tracksWithOldImageUrls: { id: string; title: string; imageUrl: string }[] = [];
    const tracksWithOldAudioUrls: { id: string; title: string; audioUrl: string }[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = data.title || 'Untitled';

        // Check images
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            const imageUrl = data.tracks[0].imageUrl || '';
            if (isOldSunoUrl(imageUrl)) {
                tracksWithOldImageUrls.push({ id: doc.id, title, imageUrl });
            }
        } else if (data.imageUrl && isOldSunoUrl(data.imageUrl)) {
            tracksWithOldImageUrls.push({ id: doc.id, title, imageUrl: data.imageUrl });
        }

        // Check audio
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            const audioUrl = data.tracks[0].audioUrl || '';
            if (isOldSunoUrl(audioUrl)) {
                tracksWithOldAudioUrls.push({ id: doc.id, title, audioUrl });
            }
        } else if (data.audioUrl && isOldSunoUrl(data.audioUrl)) {
            tracksWithOldAudioUrls.push({ id: doc.id, title, audioUrl: data.audioUrl });
        }
    }

    console.log('📸 IMAGE URLs:\n');
    if (tracksWithOldImageUrls.length === 0) {
        console.log('✅ No tracks with old Suno CDN image URLs!\n');
    } else {
        console.log(`⚠️  Found ${tracksWithOldImageUrls.length} tracks with old image URLs:\n`);
        tracksWithOldImageUrls.forEach((track, i) => {
            console.log(`${i + 1}. "${track.title}"`);
            console.log(`   ID: ${track.id}`);
            console.log(`   Image: ${track.imageUrl.substring(0, 60)}...\n`);
        });
    }

    console.log('========================================\n');
    console.log('🎵 AUDIO URLs:\n');
    if (tracksWithOldAudioUrls.length === 0) {
        console.log('✅ No tracks with old Suno CDN audio URLs!\n');
    } else {
        console.log(`⚠️  Found ${tracksWithOldAudioUrls.length} tracks with old audio URLs:\n`);
        tracksWithOldAudioUrls.forEach((track, i) => {
            console.log(`${i + 1}. "${track.title}"`);
            console.log(`   ID: ${track.id}`);
            console.log(`   Audio: ${track.audioUrl.substring(0, 60)}...\n`);
        });
    }

    console.log('========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`Images with old CDN: ${tracksWithOldImageUrls.length}`);
    console.log(`Audio with old CDN: ${tracksWithOldAudioUrls.length}`);
    console.log(`Total tracks: ${snapshot.size}`);
    console.log('========================================\n');
}

checkForOldCdnUrls().then(() => {
    console.log('Check complete!\n');
    process.exit(0);
});
