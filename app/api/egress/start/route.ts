/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { NextResponse } from 'next/server';
import { EncodedFileOutput, EncodedFileType, GCPUpload } from 'livekit-server-sdk';
import { getAdminDb } from '@/lib/firebase-admin';
import { getEgressClient, getGcpUploadConfig } from '@/lib/livekit-egress';

export async function POST(req: Request) {
  if (process.env.LIVEKIT_EGRESS_ENABLED !== 'true') {
    return NextResponse.json({ disabled: true }, { status: 200 });
  }
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const roomName = String(body?.roomName ?? '');
    const userId = body?.userId ? String(body.userId) : undefined;
    const guruId = body?.guruId ? String(body.guruId) : undefined;
    const intention = body?.intention ? String(body.intention) : undefined;

    if (!roomName) {
      return NextResponse.json({ error: 'roomName is required' }, { status: 400 });
    }

    const egressClient = getEgressClient();
    const gcp = getGcpUploadConfig();

    // Construct file path: <prefix>/<roomName>/<timestamp>.mp4
    const filename = `${roomName}-${Date.now()}.mp4`;
    // Ensure pathPrefix doesn't have leading slash if bucket doesn't want it, but usually fine.
    const filePath = `${gcp.pathPrefix}/${filename}`;

    // Configure GCP Upload
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: filePath,
      output: {
        case: 'gcp',
        value: {
          credentials: gcp.credentials,
          bucket: gcp.bucket,
        },
      },
    });

    console.log('[egress/start] Requesting egress for room:', roomName, 'User:', userId);
    console.log('[egress/start] Output config:', JSON.stringify(output.toJson(), null, 2));

    // Call startRoomCompositeEgress
    const info = await egressClient.startRoomCompositeEgress(
      roomName,
      output,
      {
        layout: 'grid',
        audioOnly: false,
      }
    );

    const egressId = info.egressId;
    const publicUrl = `https://storage.googleapis.com/${gcp.bucket}/${filePath}`;

    console.log('[egress/start] Started egressId:', egressId);

    // Persist mapping in Firestore
    try {
      const db = getAdminDb();
      await db
        .collection('recordings')
        .doc(egressId)
        .set(
          {
            egressId,
            roomName,
            userId: userId ?? null,
            guruId: guruId ?? null,
            intention: intention ?? null,
            filePath,
            publicUrl,
            bucket: gcp.bucket,
            startedAt: new Date(),
            status: 'started',
            isPublic: true, // Recordings are public by default for the RRaaSi Feed
          },
          { merge: true }
        );
    } catch (err) {
      console.warn('[egress/start] failed to write firestore', err);
    }

    return NextResponse.json({ egressId, file: filePath, publicUrl }, { status: 200 });
  } catch (error) {
    console.error('[egress/start] error', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
