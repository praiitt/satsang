import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    try {
        await initAdmin();
        const db = getFirestore();
        const auth = getAuth();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search')?.toLowerCase() || '';
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

        // Collect unique userIds to batch-fetch user info
        const userIds = [...new Set(snapshot.docs.map(d => d.data().userId).filter(Boolean))];

        // Batch fetch user info from Firebase Auth
        const userMap: Record<string, { email?: string; phone?: string; name?: string }> = {};
        await Promise.allSettled(
            userIds.map(async (uid) => {
                try {
                    const u = await auth.getUser(uid);
                    userMap[uid] = {
                        email: u.email,
                        phone: u.phoneNumber,
                        name: u.displayName,
                    };
                } catch {
                    // user may have been deleted
                }
            })
        );

        let tracks = snapshot.docs.map(doc => {
            const data = doc.data();
            const uid = data.userId || '';
            const userInfo = userMap[uid] || {};
            return {
                id: doc.id,
                ...data,
                userEmail: userInfo.email,
                userPhone: userInfo.phone,
                userName: userInfo.name,
            };
        });

        // Client-side search filter (title, user email/name)
        if (search) {
            tracks = tracks.filter(t =>
                (t.title || '').toLowerCase().includes(search) ||
                (t.userEmail || '').toLowerCase().includes(search) ||
                (t.userName || '').toLowerCase().includes(search) ||
                (t.userId || '').toLowerCase().includes(search)
            );
        }

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
