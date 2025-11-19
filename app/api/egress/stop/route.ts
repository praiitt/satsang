/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import { getEgressClient } from '@/lib/livekit-egress';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomName: string | undefined = body?.roomName;
    const egressIds: string[] | undefined = body?.egressIds;

    if (!roomName) {
      return NextResponse.json({ error: 'roomName is required' }, { status: 400 });
    }

    if (process.env.LIVEKIT_EGRESS_ENABLED !== 'true') {
      return NextResponse.json({ stopped: egressIds ?? [], disabled: true }, { status: 200 });
    }

    const client = getEgressClient();

    // List ALL active egress IDs for this room (always stop all, regardless of tracked IDs)
    const listRequest = { roomName };
    const listResponse = await (client as unknown as any).listEgress(listRequest);
    const allActiveEgresses = listResponse?.items || listResponse || [];

    console.log(`[egress/stop] Room: ${roomName}`);
    console.log(`[egress/stop] Found ${allActiveEgresses.length} active egress(es) in room`);

    const activeEgressIds = allActiveEgresses.map((e: any) => e.egressId || e.egress_id);
    console.log(`[egress/stop] Active egress IDs:`, activeEgressIds);

    if (egressIds && egressIds.length > 0) {
      console.log(`[egress/stop] Tracked egress IDs:`, egressIds);
      const untracked = activeEgressIds.filter((id: string) => !egressIds.includes(id));
      if (untracked.length > 0) {
        console.log(
          `[egress/stop] ⚠️ Found ${untracked.length} untracked egress ID(s):`,
          untracked
        );
      }
    }

    // Always stop ALL egress IDs in the room (safety: don't miss any)
    const targets = allActiveEgresses;
    console.log(`[egress/stop] Stopping ALL ${targets.length} egress(es) in room`);

    const stopped: string[] = [];
    const db = getAdminDb();
    for (const e of targets) {
      try {
        const egressId = e.egressId || e.egress_id;
        console.log(`[egress/stop] Stopping egress ID: ${egressId}`);
        // LiveKit SDK stopEgress expects just the egress ID string, not an object
        await client.stopEgress(egressId);
        stopped.push(egressId);

        // Update Firestore with stop status
        await db.collection('recordings').doc(String(egressId)).set(
          {
            stoppedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'stopped',
          },
          { merge: true }
        );
        console.log(`[egress/stop] ✅ Successfully stopped egress ID: ${egressId}`);
      } catch (e2) {
        const egressId = e.egressId || e.egress_id;
        console.warn(`[egress/stop] ❌ Failed to stop egress ID: ${egressId}`, e2);
      }
    }

    console.log(`[egress/stop] Stopped ${stopped.length} out of ${targets.length} egress(es)`);
    return NextResponse.json({ stopped, total: allActiveEgresses.length }, { status: 200 });
  } catch (error) {
    console.error('[egress/stop] error', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
