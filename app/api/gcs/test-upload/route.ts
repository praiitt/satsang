import { NextResponse } from 'next/server';
import { getGcsBucket } from '@/lib/gcs';

export async function POST() {
  try {
    const bucket = getGcsBucket();
    const bucketName = bucket.name;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = process.env.LIVEKIT_EGRESS_GCP_PREFIX || 'recordings';
    const filePath = `${prefix}/test/${timestamp}-health.txt`;

    const file = bucket.file(filePath);
    await file.save('ok', {
      contentType: 'text/plain; charset=utf-8',
      resumable: false,
      metadata: {
        cacheControl: 'no-cache',
      },
    });

    // Generate signed URL (valid for 7 days) since uniform bucket-level access is enabled
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const publicUrl = `gs://${bucketName}/${filePath}`;
    return NextResponse.json(
      {
        ok: true,
        bucket: bucketName,
        filePath,
        publicUrl,
        signedUrl,
        message: 'File uploaded successfully. Use signedUrl to access it (valid for 7 days).',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: errorMsg, bucket: process.env.LIVEKIT_EGRESS_GCP_BUCKET },
      { status: 500 }
    );
  }
}
