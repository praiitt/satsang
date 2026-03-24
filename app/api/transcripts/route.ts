import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const snapshot = await db
            .collection('session_transcripts')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const transcripts = snapshot.docs.map((doc) => {
            const data = doc.to_dict ? doc.to_dict() : doc.data();
            return {
                id: doc.id,
                roomName: data.roomName,
                agentName: data.agentName,
                userId: data.userId,
                messageCount: Array.isArray(data.transcript) ? data.transcript.length : 0,
                createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? null,
            };
        });

        return NextResponse.json({ transcripts });
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 });
    }
}
