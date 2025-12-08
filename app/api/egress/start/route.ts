/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { NextResponse } from 'next/server';
import { EncodedFileOutput, EncodedFileType, GCPUpload } from 'livekit-server-sdk';
import { getAdminDb } from '@/lib/firebase-admin';
import { getEgressClient, getGcpUploadConfig } from '@/lib/livekit-egress';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const roomName = String(body?.roomName ?? '');
    const userId = body?.userId ? String(body.userId) : undefined;
    if (!roomName) {
      return NextResponse.json({ error: 'roomName is required' }, { status: 400 });
    }

    // Allow disabling egress in local/dev without failing the app
    if (process.env.LIVEKIT_EGRESS_ENABLED !== 'true') {
      return NextResponse.json({ egressId: `dev-${Date.now()}`, disabled: true }, { status: 200 });
    }

    const client = getEgressClient();
    const gcp = getGcpUploadConfig();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basePath = `${gcp.pathPrefix}/${roomName}/${timestamp}`;

    // Respect env preferences for output format
    const FILE_TYPE_ENV = (process.env.LIVEKIT_EGRESS_FILE_TYPE || '').toUpperCase();
    const FILE_BASENAME = process.env.LIVEKIT_EGRESS_FILE_BASENAME || 'audio';
    const AUDIO_ONLY = (process.env.LIVEKIT_EGRESS_AUDIO_ONLY || 'true').toLowerCase() !== 'false';

    // Map file type string to EncodedFileType enum (SDK only supports DEFAULT_FILETYPE, MP4, OGG)
    // For audio-only, use OGG (OGG_OPUS) or DEFAULT_FILETYPE
    // For video, use MP4
    const fileTypeMap: Record<string, EncodedFileType> = {
      MP4: EncodedFileType.MP4,
      OGG: EncodedFileType.OGG,
      MP3: EncodedFileType.OGG, // MP3 not directly supported, use OGG for audio
      WEBM: EncodedFileType.MP4, // WEBM not directly supported, use MP4 for video
      DEFAULT: EncodedFileType.DEFAULT_FILETYPE,
    };
    const fileType =
      fileTypeMap[FILE_TYPE_ENV] ?? (AUDIO_ONLY ? EncodedFileType.OGG : EncodedFileType.MP4);

    // Map file type to extension
    const extMap: Record<EncodedFileType, string> = {
      [EncodedFileType.DEFAULT_FILETYPE]: AUDIO_ONLY ? 'ogg' : 'mp4',
      [EncodedFileType.MP4]: 'mp4',
      [EncodedFileType.OGG]: 'ogg',
      // @ts-ignore - MP3 exists in the version installed on the build server
      [(EncodedFileType as any).MP3]: 'mp3',
    };
    const ext = extMap[fileType];
    const fileName = `${FILE_BASENAME}.${ext}`;
    const filePath = `${basePath}/${fileName}`;

    // Create GCP upload object
    const gcpUpload = new GCPUpload({
      bucket: gcp.bucket,
      credentials: gcp.credentials,
    });

    // Create EncodedFileOutput with GCP storage in the output field
    // The output field is a protobuf oneof: {case: "gcp", value: GCPUpload}
    const fileOutput = new EncodedFileOutput({
      fileType,
      filepath: filePath,
      output: {
        case: 'gcp',
        value: gcpUpload,
      },
    });

    // Log for debugging
    console.log('[egress/start] Starting egress for room:', roomName);
    console.log('[egress/start] File path:', filePath);
    console.log('[egress/start] File type:', fileType);
    console.log('[egress/start] GCP bucket:', gcp.bucket);
    console.log(
      '[egress/start] EncodedFileOutput output:',
      JSON.stringify((fileOutput as any).output, null, 2)
    );

    // Start egress - pass EncodedFileOutput directly with options
    // The method signature is: startRoomCompositeEgress(roomName, output, opts)
    const info = await client.startRoomCompositeEgress(roomName, fileOutput, {
      audioOnly: AUDIO_ONLY,
    });
    const egressId: string = info.egressId;
    console.log('[egress/start] ✅ Egress started successfully. Egress ID:', egressId);
    const publicUrl = `https://storage.googleapis.com/${gcp.bucket}/${filePath}`;

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
            filePath,
            publicUrl,
            bucket: gcp.bucket,
            startedAt: new Date(),
            status: 'started',
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
