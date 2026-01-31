import { meditationService } from './meditation.service.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Seed dummy meditation sessions for testing
 */

async function seedDummyData() {
    console.log('🧘 Seeding dummy meditation data...\n');

    const testUserId = 'test_user_meditation_123';

    // Seed sessions with variety of data
    const sessions = [
        // Recent sessions
        {
            userId: testUserId,
            intention: 'Find peace and clarity',
            mood_before: 'stressed' as const,
            mood_after: 'peaceful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 1500, // 25 minutes
            agentGuided: true,
            notes: 'Amazing session! Felt deeply connected.',
            completedAt: new Date() as any
        },
        {
            userId: testUserId,
            intention: 'Morning energy boost',
            mood_before: 'tired' as const,
            mood_after: 'joyful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 1200, // 20 minutes
            agentGuided: true,
            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) as any // Yesterday
        },
        {
            userId: testUserId,
            intention: 'Release anxiety',
            mood_before: 'stressed' as const,
            mood_after: 'peaceful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 1800, // 30 minutes
            agentGuided: true,
            notes: 'Needed this so much',
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) as any // 2 days ago
        },
        {
            userId: testUserId,
            intention: 'Celebrate life',
            mood_before: 'joyful' as const,
            mood_after: 'joyful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 900, // 15 minutes
            agentGuided: true,
            completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) as any // 3 days ago
        },
        {
            userId: testUserId,
            intention: 'Evening wind down',
            mood_before: 'tired' as const,
            mood_after: 'peaceful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 1500,
            agentGuided: true,
            completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) as any // 4 days ago
        },
        // Older sessions for streak testing
        {
            userId: testUserId,
            intention: 'Inner peace',
            mood_before: 'neutral' as const,
            mood_after: 'peaceful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 1200,
            agentGuided: true,
            completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) as any // 7 days ago
        },
        {
            userId: testUserId,
            intention: 'Gratitude practice',
            mood_before: 'peaceful' as const,
            mood_after: 'joyful' as const,
            musicUsed: [],
            generatedMusic: false,
            duration: 1000,
            agentGuided: true,
            completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) as any // 14 days ago
        }
    ];

    let created = 0;
    for (const session of sessions) {
        try {
            const id = await meditationService.saveSession(session);
            created++;
            console.log(`✅ Created session ${created}/7: "${session.intention}"`);
        } catch (error) {
            console.error(`❌ Failed to create session:`, error);
        }
    }

    console.log(`\n✅ Seeded ${created} meditation sessions for user: ${testUserId}\n`);
    return testUserId;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDummyData()
        .then(() => {
            console.log('✅ Dummy data seeding complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

export { seedDummyData };
