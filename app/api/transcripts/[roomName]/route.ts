import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const revalidate = 0;

export async function GET(
    request: Request,
    { params }: { params: { roomName: string } }
) {
    try {
        const roomName = decodeURIComponent(params.roomName);
        const doc = await adminDb.collection('session_transcripts').doc(roomName).get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
        }

        const data = doc.data() as Record<string, unknown>;

        // Also check for associated recording
        let recordingUrl: string | null = null;
        try {
            const recDoc = await adminDb.collection('recordings').doc(roomName).get();
            if (recDoc.exists) {
                const recData = recDoc.data() as Record<string, unknown>;
                recordingUrl = (recData?.recordingUrl as string) ?? null;
            }
        } catch {
            // Recording is optional — don't fail if not found
        }

        return NextResponse.json({
            id: doc.id,
            roomName: data.roomName,
            agentName: data.agentName,
            userId: data.userId,
            transcript: data.transcript ?? [],
            recordingUrl,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? data.createdAt ?? null,
        });
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
    }
}
