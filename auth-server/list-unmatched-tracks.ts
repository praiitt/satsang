import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';

initFirebaseAdmin();

function isOldSunoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('musicfile.api.box') ||
        url.includes('cdn.suno.ai') ||
        (url.includes('http') && !url.includes('storage.googleapis.com'));
}

async function listUnmatchedTracks() {
    console.log('\n========================================');
    console.log('📋 Unmatched Tracks Report');
    console.log('========================================\n');

    const db = getDb();
    const snapshot = await db.collection('music_tracks').get();

    const unmatchedTracks: {
        title: string;
        id: string;
        audioUrl: string;
        status: string;
    }[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = data.title || 'Untitled';

        let hasOldUrl = false;
        let audioUrl = '';

        // Check tracks array format
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            audioUrl = data.tracks[0].audioUrl || '';
            if (isOldSunoUrl(audioUrl)) {
                hasOldUrl = true;
            }
        }

        // Check old format
        if (data.audioUrl) {
            audioUrl = data.audioUrl;
            if (isOldSunoUrl(audioUrl)) {
                hasOldUrl = true;
            }
        }

        // Check for NO URL
        if (!audioUrl || audioUrl === '' || audioUrl === 'NO URL') {
            hasOldUrl = true;
            audioUrl = 'NO URL';
        }

        if (hasOldUrl) {
            unmatchedTracks.push({
                title,
                id: doc.id,
                audioUrl: audioUrl.substring(0, 60) + (audioUrl.length > 60 ? '...' : ''),
                status: data.status || 'UNKNOWN'
            });
        }
    }

    console.log(`Total tracks with missing/expired URLs: ${unmatchedTracks.length}\n`);
    console.log('========================================\n');

    // Group by unique title
    const uniqueTitles = new Map<string, typeof unmatchedTracks>();

    for (const track of unmatchedTracks) {
        if (!uniqueTitles.has(track.title)) {
            uniqueTitles.set(track.title, []);
        }
        uniqueTitles.get(track.title)!.push(track);
    }

    let counter = 1;
    for (const [title, tracks] of uniqueTitles) {
        console.log(`${counter}. "${title}"`);

        for (const track of tracks) {
            console.log(`   ID: ${track.id}`);
            console.log(`   Status: ${track.status}`);
            console.log(`   Current URL: ${track.audioUrl}`);
            console.log('');
        }

        counter++;
    }

    console.log('========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`Unique track titles: ${uniqueTitles.size}`);
    console.log(`Total documents: ${unmatchedTracks.length}`);
    console.log('========================================\n');
}

listUnmatchedTracks().then(() => {
    console.log('Report complete!\n');
    process.exit(0);
});
