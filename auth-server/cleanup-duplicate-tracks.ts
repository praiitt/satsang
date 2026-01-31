import { getDb } from './src/firebase.js';
import { initFirebaseAdmin } from './src/firebase.js';

initFirebaseAdmin();

function isOldSunoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('musicfile.api.box') ||
        url.includes('cdn.suno.ai') ||
        url.includes('removeai.ai') ||
        (url.includes('http') && !url.includes('storage.googleapis.com'));
}

async function cleanupDuplicateBrokenTracks() {
    console.log('\n========================================');
    console.log('🧹 Cleanup Duplicate Broken Tracks');
    console.log('========================================\n');

    const db = getDb();
    const snapshot = await db.collection('music_tracks').get();

    // Group tracks by title
    const tracksByTitle = new Map<string, {
        id: string;
        audioUrl: string;
        status: string;
        createdAt: any;
    }[]>();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = data.title || 'Untitled';

        let audioUrl = '';

        // Get audio URL
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            audioUrl = data.tracks[0].audioUrl || '';
        } else if (data.audioUrl) {
            audioUrl = data.audioUrl;
        }

        // Check for NO URL
        if (!audioUrl || audioUrl === '' || audioUrl === 'NO URL') {
            audioUrl = 'NO URL';
        }

        // Only consider broken tracks
        if (isOldSunoUrl(audioUrl) || audioUrl === 'NO URL') {
            if (!tracksByTitle.has(title)) {
                tracksByTitle.set(title, []);
            }

            tracksByTitle.get(title)!.push({
                id: doc.id,
                audioUrl,
                status: data.status || 'UNKNOWN',
                createdAt: data.createdAt
            });
        }
    }

    console.log(`Found ${tracksByTitle.size} unique broken track titles\n`);

    // Find duplicates
    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const [title, versions] of tracksByTitle) {
        if (versions.length > 1) {
            console.log(`\n📁 "${title}" - ${versions.length} versions`);

            // Sort by creation date (keep the oldest/first one)
            versions.sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return a.createdAt.toMillis() - b.createdAt.toMillis();
            });

            // Keep the first one
            const keepId = versions[0].id;
            toKeep.push(keepId);
            console.log(`  ✅ KEEP: ${keepId} (${versions[0].status})`);

            // Delete the rest
            for (let i = 1; i < versions.length; i++) {
                const deleteId = versions[i].id;
                toDelete.push(deleteId);
                console.log(`  ❌ DELETE: ${deleteId} (${versions[i].status})`);
            }
        } else {
            console.log(`\n📁 "${title}" - 1 version (no duplicates)`);
            toKeep.push(versions[0].id);
            console.log(`  ✅ KEEP: ${versions[0].id}`);
        }
    }

    console.log('\n\n========================================');
    console.log('📊 Cleanup Summary');
    console.log('========================================');
    console.log(`✅ Will keep: ${toKeep.length} tracks`);
    console.log(`❌ Will delete: ${toDelete.length} duplicate versions`);
    console.log('========================================\n');

    if (toDelete.length === 0) {
        console.log('✅ No duplicates to delete!\n');
        return;
    }

    console.log('⚠️  About to delete duplicate versions...\n');

    // Delete duplicates
    let deleteCount = 0;
    const batch = db.batch();

    for (const id of toDelete) {
        const docRef = db.collection('music_tracks').doc(id);
        batch.delete(docRef);
        deleteCount++;

        // Firestore batch limit is 500, commit if needed
        if (deleteCount % 500 === 0) {
            await batch.commit();
            console.log(`  Committed batch: ${deleteCount} deletions`);
        }
    }

    // Commit remaining
    if (deleteCount % 500 !== 0) {
        await batch.commit();
    }

    console.log(`\n✅ Successfully deleted ${deleteCount} duplicate tracks!\n`);
}

cleanupDuplicateBrokenTracks().then(() => {
    console.log('Cleanup complete!\n');
    process.exit(0);
}).catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
});
