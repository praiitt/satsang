import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '24');
        const db = getAdminDb();

        // Fetch public art from spiritual_art collection
        const snapshot = await db.collection('spiritual_art')
            .where('isPublic', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const artItems = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: 'art',
                imageDataUrl: data.imageDataUrl,
                intention: data.intention,
                enhancedPrompt: data.enhancedPrompt,
                createdAt: data.createdAt,
                userId: data.userId,
            };
        });

        // Fetch public art from Auth Server (Suno-generated images and videos)
        const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
        let sunoArtItems: any[] = [];
        try {
            const sunoRes = await fetch(`${authServerUrl}/suno/public-art?limit=${limit}`);
            if (sunoRes.ok) {
                const data = await sunoRes.json();
                sunoArtItems = (data.artItems || []).map((item: any) => ({
                    id: item.id,
                    type: 'art',
                    imageDataUrl: item.url, // url can be image or video
                    isVideo: item.type === 'video',
                    intention: item.trackTitle || 'Community Creation',
                    enhancedPrompt: item.prompt || '',
                    createdAt: item.createdAt,
                    userId: item.ownerId,
                }));
            }
        } catch (err) {
            console.error('[Community Art API] Failed to fetch Suno art:', err);
        }

        // Combine and sort
        const combinedArt = [...artItems, ...sunoArtItems].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA;
        }).slice(0, limit);

        return NextResponse.json({ artItems: combinedArt, total: combinedArt.length });
    } catch (error: any) {
        console.error('[Community Art API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
