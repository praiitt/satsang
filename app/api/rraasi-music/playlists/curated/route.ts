import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
    try {
        await initAdmin();
        const db = getFirestore();
        
        const playlistsSnapshot = await db
            .collection('playlists')
            .where('type', '==', 'curated')
            .where('isPublic', '==', true)
            .get();

        const playlists = playlistsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by createdAt client-side since we didn't add a composite index for type+isPublic+createdAt
        playlists.sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });

        return NextResponse.json({ playlists });
    } catch (error) {
        console.error('[Public Curated Playlists GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch curated playlists' }, { status: 500 });
    }
}
