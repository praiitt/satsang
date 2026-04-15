import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Force dynamic execution to ensure a fresh random track on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const db = getAdminDb();
        // Fetch up to 50 tracks that specifically contain healingBenefits metadata
        const snapshot = await db
            .collection('music_tracks')
            .where('status', '==', 'PUBLISHED')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'No published tracks found' }, { status: 404 });
        }

        const healingTracks: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Stricter filtering for healingBenefits presence
            if (data.healingBenefits && data.audioUrl) {
                healingTracks.push({
                    id: doc.id,
                    title: data.title,
                    audioUrl: data.audioUrl,
                    healingBenefits: data.healingBenefits
                });
            }
        });

        if (healingTracks.length === 0) {
            // Fallback: Just return a random published track if no healing one is found
            const docs = snapshot.docs.filter(d => d.data().audioUrl);
            if (docs.length === 0) return NextResponse.json({ error: 'No audio tracks found' }, { status: 404 });
            const randomDoc = docs[Math.floor(Math.random() * docs.length)].data();
            return NextResponse.json({ audioUrl: randomDoc.audioUrl, fallback: true });
        }

        // Randomly select one healing track to serve as the ambient background
        const randomTrack = healingTracks[Math.floor(Math.random() * healingTracks.length)];

        return NextResponse.json({
            audioUrl: randomTrack.audioUrl,
            title: randomTrack.title,
            healingBenefits: randomTrack.healingBenefits
        });
    } catch (error) {
        console.error('Error fetching healing ambient music:', error);
        return NextResponse.json({ error: 'Failed to fetch ambient track' }, { status: 500 });
    }
}
