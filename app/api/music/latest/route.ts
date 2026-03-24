import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const planId = searchParams.get('planId'); // Added planId support

    if (!userId && !planId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    try {
        const db = getAdminDb();
        
        let targetDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        
        if (planId) {
            // Find the specific task ID for this plan to avoid user ID conflicts from the webhook
            const planDoc = await db.collection('satsang_plans').doc(planId).get();
            if (planDoc.exists && planDoc.data()?.suno_task_id) {
                const taskId = planDoc.data()!.suno_task_id;
                targetDoc = await db.collection('music_tracks').doc(taskId).get();
            }
        } 
        
        if (!targetDoc || !targetDoc.exists) {
            // Fallback to latest by user ID
            if (userId) {
                const snapshot = await db.collection('music_tracks')
                    .where('userId', 'in', [userId, 'default_user']) // ⚡️ Fetch default_user tracks to catch webhook bugs
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    targetDoc = snapshot.docs[0];
                }
            }
        }

        if (!targetDoc || !targetDoc.exists) {
            return NextResponse.json({ track: null });
        }

        const data = targetDoc.data()!;

        // ⚡️ SELF-HEALING HOOK: If the external Auth Server webhook corrupted 
        // the track by assigning it to "default_user", we intercept it here 
        // on the first read and permanently reclaim it for the actual user!
        if (data.userId === 'default_user' && userId && userId !== 'default_user') {
            try {
                await targetDoc.ref.update({ userId: userId });
                console.log(`[music/latest] 🩹 Auto-corrected corrupted webhook track ${targetDoc.id} back to user ${userId}`);
                data.userId = userId; // Update memory object for this response
            } catch (patchErr) {
                console.warn(`[music/latest] Failed to patch corrupted track ${targetDoc.id}:`, patchErr);
            }
        }

        return NextResponse.json({
            track: {
                id: targetDoc.id,
                title: data.title,
                audioUrl: data.audioUrl,
                imageUrl: data.imageUrl,
                tags: data.tags || data.metadata?.tags,
                createdAt: data.createdAt,
                status: data.status || (data.audioUrl ? 'COMPLETED' : 'PENDING'),
            }
        });
    } catch (error) {
        console.error('[music/latest] Error fetching latest track:', error);
        return NextResponse.json({ error: 'Failed to fetch track' }, { status: 500 });
    }
}
