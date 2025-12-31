import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const guruId = searchParams.get('guruId');

        if (!guruId) {
            return NextResponse.json({ error: 'Missing guruId' }, { status: 400 });
        }

        const db = getAdminDb();

        // Fetch recent plans for this guru
        const snapshot = await db.collection('satsang_plans')
            .where('guruId', '==', guruId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const topics = new Set<string>();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.topic) {
                // Capitalize first letter and trim
                const cleanTopic = data.topic.trim();
                if (cleanTopic.length > 3 && cleanTopic.length < 50) { // basic validation
                    topics.add(cleanTopic);
                }
            }
        });

        // Convert to array and limit
        const distinctTopics = Array.from(topics).slice(0, 8);

        return NextResponse.json({ topics: distinctTopics });

    } catch (error: any) {
        console.error('Error fetching satsang topics:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
