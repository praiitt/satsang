import { getDb } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Seed initial meditation playlists
 * Run once to create official meditation playlists
 */

async function seedMeditationPlaylists() {
    const db = getDb();

    const playlists = [
        {
            name: 'Morning Energy',
            description: 'Uplifting dance meditation to start your day with joy and vitality',
            sessionType: 'morning',
            trackIds: [], // Will be populated based on available music
            duration: 25,
            bpmRange: { min: 100, max: 120 },
            createdBy: 'official',
            isOfficial: true,
            isPublic: true,
            createdAt: FieldValue.serverTimestamp()
        },
        {
            name: 'Evening Release',
            description: 'Gentle flow to release the day and find peace',
            sessionType: 'evening',
            trackIds: [],
            duration: 20,
            bpmRange: { min: 80, max: 100 },
            createdBy: 'official',
            isOfficial: true,
            isPublic: true,
            createdAt: FieldValue.serverTimestamp()
        },
        {
            name: 'Celebration Dance',
            description: 'Joyful, high-energy meditation to celebrate life',
            sessionType: 'celebration',
            trackIds: [],
            duration: 30,
            bpmRange: { min: 120, max: 140 },
            createdBy: 'official',
            isOfficial: true,
            isPublic: true,
            createdAt: FieldValue.serverTimestamp()
        },
        {
            name: 'Deep Connection',
            description: 'Slow, meditative dance for profound inner stillness',
            sessionType: 'deep',
            trackIds: [],
            duration: 30,
            bpmRange: { min: 60, max: 80 },
            createdBy: 'official',
            isOfficial: true,
            isPublic: true,
            createdAt: FieldValue.serverTimestamp()
        }
    ];

    console.log('🎵 Seeding meditation playlists...\n');

    for (const playlist of playlists) {
        try {
            // Check if playlist already exists
            const existing = await db
                .collection('meditation_playlists')
                .where('name', '==', playlist.name)
                .where('isOfficial', '==', true)
                .limit(1)
                .get();

            if (!existing.empty) {
                console.log(`⏭️  Skipping "${playlist.name}" - already exists`);
                continue;
            }

            // Create playlist
            const docRef = await db.collection('meditation_playlists').add(playlist);
            console.log(`✅ Created "${playlist.name}" (${docRef.id})`);
        } catch (error) {
            console.error(`❌ Failed to create "${playlist.name}":`, error);
        }
    }

    console.log('\n✅ Meditation playlist seeding complete!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedMeditationPlaylists()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}

export { seedMeditationPlaylists };
