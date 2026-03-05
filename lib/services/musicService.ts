import { getAdminDb } from '@/lib/firebase-admin';

export async function getRandomMeditationTrack() {
    const db = getAdminDb();

    // Fetch from both tags and merge
    const [meditationSnap, healingSnap] = await Promise.all([
        db.collection('music_tracks')
            .where('tags', 'array-contains', 'meditation')
            .where('status', '==', 'COMPLETED')
            .limit(50)
            .get(),
        db.collection('music_tracks')
            .where('tags', 'array-contains', 'healing')
            .where('status', '==', 'COMPLETED')
            .limit(50)
            .get(),
    ]);

    const tracks: any[] = [];

    meditationSnap.forEach(doc => {
        const data = doc.data();
        if (data.audioUrl || (data.tracks && data.tracks.length > 0)) {
            tracks.push({ id: doc.id, ...data });
        }
    });

    healingSnap.forEach(doc => {
        const data = doc.data();
        if (data.audioUrl || (data.tracks && data.tracks.length > 0)) {
            tracks.push({ id: doc.id, ...data });
        }
    });

    if (tracks.length === 0) {
        // Fallback: fetch any completed track
        const fallbackSnap = await db.collection('music_tracks')
            .where('status', '==', 'COMPLETED')
            .limit(20)
            .get();

        fallbackSnap.forEach(doc => {
            const data = doc.data();
            if (data.audioUrl || (data.tracks && data.tracks.length > 0)) {
                tracks.push({ id: doc.id, ...data });
            }
        });
    }

    if (tracks.length === 0) {
        return null;
    }

    // Pick a random track
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

    // Resolve audioUrl — check if it's inside tracks[] array (new format)
    let audioUrl = randomTrack.audioUrl;
    if (!audioUrl && randomTrack.tracks && randomTrack.tracks.length > 0) {
        audioUrl = randomTrack.tracks[0].audioUrl;
    }

    if (!audioUrl) return null;

    return {
        id: randomTrack.id,
        title: randomTrack.title || 'Bhajan',
        audioUrl,
        imageUrl: randomTrack.imageUrl || null,
        category: randomTrack.tags?.[0] || 'meditation',
        duration: randomTrack.duration || null,
    };
}
