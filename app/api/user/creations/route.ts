import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(token);
        const userId = decoded.uid;

        const db = getAdminDb();
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        // Fetch User's Art from spiritual_art collection
        const artSnapshot = await db.collection('spiritual_art')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const artItems = artSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: 'art',
                imageDataUrl: data.imageDataUrl,
                intention: data.intention,
                enhancedPrompt: data.enhancedPrompt,
                createdAt: data.createdAt,
                userId: data.userId,
                isPublic: data.isPublic || false,
                isVideo: false,
            };
        });

        // Fetch User's Music and Video Tracks from Auth Server
        const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
        let sunoTracks: any[] = [];
        let sunoArtItems: any[] = [];
        
        try {
            const sunoRes = await fetch(`${authServerUrl}/suno/tracks?userId=${userId}&limit=${limit}`);
            if (sunoRes.ok) {
                const data = await sunoRes.json();
                sunoTracks = data.tracks || [];

                // Extract generated video and images as "art" items to display in the gallery
                sunoTracks.forEach((track: any) => {
                    // Check if there is a generated video (Reel)
                    if (track.videoUrl) {
                        sunoArtItems.push({
                            id: `${track.id}_video`,
                            type: 'art',
                            imageDataUrl: track.videoUrl,
                            isVideo: true,
                            intention: track.title || 'Community Reel',
                            enhancedPrompt: track.prompt || '',
                            createdAt: track.createdAt,
                            userId: track.userId,
                            isPublic: track.isPublic || false,
                            trackId: track.id // Link back to the parent track
                        });
                    }

                    // Check if there are generated images
                    if (track.generatedVideoImages && Array.isArray(track.generatedVideoImages)) {
                        track.generatedVideoImages.forEach((imgUrl: string, idx: number) => {
                            sunoArtItems.push({
                                id: `${track.id}_img_${idx}`,
                                type: 'art',
                                imageDataUrl: imgUrl,
                                isVideo: false,
                                intention: track.title || 'Music Art',
                                enhancedPrompt: track.prompt || '',
                                createdAt: track.createdAt,
                                userId: track.userId,
                                isPublic: track.isPublic || false,
                                trackId: track.id
                            });
                        });
                    }
                });
            }
        } catch (err) {
            console.error('[User Creations API] Failed to fetch Suno tracks:', err);
        }

        // Combine Art
        const combinedArt = [...artItems, ...sunoArtItems].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA;
        });

        return NextResponse.json({ 
            artItems: combinedArt.slice(0, limit), 
            musicTracks: sunoTracks,
            totalArt: combinedArt.length,
            totalMusic: sunoTracks.length
        });
    } catch (error: any) {
        console.error('[User Creations API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
