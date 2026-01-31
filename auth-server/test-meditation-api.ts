#!/usr/bin/env node

/**
 * Test all meditation API endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';
const TEST_USER_ID = 'test_user_meditation_123';

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL';
    response?: any;
    error?: string;
}

const results: TestResult[] = [];

async function test(name: string, testFn: () => Promise<any>) {
    try {
        console.log(`\n🧪 Testing: ${name}...`);
        const response = await testFn();
        console.log(`✅ PASS: ${name}`);
        results.push({ name, status: 'PASS', response });
        return response;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.error(error);
        results.push({ name, status: 'FAIL', error: (error as Error).message });
        return null;
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('🧘 RRAASI Meditation API Tests');
    console.log('='.repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test User: ${TEST_USER_ID}\n`);

    // Test 1: Get user sessions
    await test('GET /meditation/sessions', async () => {
        const response = await fetch(
            `${BASE_URL}/meditation/sessions?userId=${TEST_USER_ID}&limit=5`
        );
        const data = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        if (!data.sessions || !Array.isArray(data.sessions)) {
            throw new Error('Invalid response: sessions array not found');
        }

        console.log(`   Found ${data.sessions.length} sessions`);
        if (data.sessions.length > 0) {
            console.log(`   Latest: "${data.sessions[0].intention}"`);
        }
        return data;
    });

    // Test 2: Get user stats
    await test('GET /meditation/stats', async () => {
        const response = await fetch(
            `${BASE_URL}/meditation/stats?userId=${TEST_USER_ID}`
        );
        const data = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        if (!data.stats) {
            throw new Error('Invalid response: stats not found');
        }

        console.log(`   Total sessions: ${data.stats.totalSessions}`);
        console.log(`   Total minutes: ${data.stats.totalMinutes}`);
        console.log(`   Current streak: ${data.stats.currentStreak} days`);
        console.log(`   Longest streak: ${data.stats.longestStreak} days`);
        return data;
    });

    // Test 3: Create new session
    let newSessionId: string | null = null;
    await test('POST /meditation/sessions', async () => {
        const response = await fetch(`${BASE_URL}/meditation/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: TEST_USER_ID,
                intention: 'API Test Session',
                mood_before: 'neutral',
                duration: 600,
                musicUsed: [],
                agentGuided: false
            })
        });
        const data = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        if (!data.success || !data.sessionId) {
            throw new Error('Invalid response: sessionId not returned');
        }

        newSessionId = data.sessionId;
        console.log(`   Created session: ${newSessionId}`);
        return data;
    });

    // Test 4: Update session mood
    if (newSessionId) {
        await test('PATCH /meditation/sessions/:id/mood', async () => {
            const response = await fetch(
                `${BASE_URL}/meditation/sessions/${newSessionId}/mood`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mood_after: 'joyful',
                        notes: 'Test note from API test'
                    })
                }
            );
            const data = await response.json();

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
            if (!data.success) {
                throw new Error('Mood update failed');
            }

            console.log(`   Updated mood to: joyful`);
            return data;
        });

        // Test 5: Get specific session
        await test('GET /meditation/sessions/:id', async () => {
            const response = await fetch(
                `${BASE_URL}/meditation/sessions/${newSessionId}`
            );
            const data = await response.json();

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
            if (!data.session) {
                throw new Error('Session not found');
            }

            console.log(`   Got session: "${data.session.intention}"`);
            console.log(`   Mood: ${data.session.mood_before} → ${data.session.mood_after}`);
            return data;
        });
    }

    // Test 6: Get playlists
    await test('GET /meditation/playlists', async () => {
        const response = await fetch(`${BASE_URL}/meditation/playlists`);
        const data = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        if (!data.playlists || !Array.isArray(data.playlists)) {
            throw new Error('Invalid response: playlists array not found');
        }

        console.log(`   Found ${data.playlists.length} playlists`);
        data.playlists.slice(0, 3).forEach((p: any) => {
            console.log(`   - ${p.name} (${p.sessionType})`);
        });
        return data;
    });

    // Test 7: Get recommended music
    await test('GET /meditation/music/recommended', async () => {
        const response = await fetch(
            `${BASE_URL}/meditation/music/recommended?mood=peaceful&bpmPreference=medium`
        );
        const data = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        if (!data.tracks || !Array.isArray(data.tracks)) {
            throw new Error('Invalid response: tracks array not found');
        }

        console.log(`   Found ${data.count} recommended tracks`);
        data.tracks.slice(0, 3).forEach((t: any) => {
            console.log(`   - ${t.title} (${t.bpm || 'N/A'} BPM)`);
        });
        return data;
    });

    // Test 8: Create custom playlist
    await test('POST /meditation/playlists', async () => {
        const response = await fetch(`${BASE_URL}/meditation/playlists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Custom Playlist',
                description: 'Created by API test',
                sessionType: 'morning',
                trackIds: [],
                duration: 20,
                bpmRange: { min: 90, max: 110 },
                createdBy: TEST_USER_ID,
                isPublic: false
            })
        });
        const data = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        if (!data.success || !data.playlistId) {
            throw new Error('Playlist creation failed');
        }

        console.log(`   Created playlist: ${data.playlistId}`);
        return data;
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    console.log(`Total: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\nFailed tests:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('='.repeat(60));

    return failed === 0;
}

// Run tests
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
