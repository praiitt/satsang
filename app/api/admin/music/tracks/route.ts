import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    try {
        await initAdmin();
        const db = getFirestore();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Get total count
        const countSnapshot = await db.collection('music_tracks').count().get();
        const total = countSnapshot.data().count;

        // Get tracks with pagination
        const snapshot = await db.collection('music_tracks')
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const tracks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            tracks,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching music tracks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tracks' },
            { status: 500 }
        );
    }
}
