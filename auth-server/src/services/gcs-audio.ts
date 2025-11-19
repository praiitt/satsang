import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

const GCS_BUCKET_NAME = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'satsangrecordings';

function getGcsBucket() {
  // Try multiple credential sources (matching other scripts)
  let credentialsJson: string | undefined =
    process.env.GCP_CREDENTIALS ||
    process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Check if credentials are base64 encoded
  const isBase64 = process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS_BASE64 === 'true';
  
  if (!credentialsJson) {
    // Try file path
    const filePath = path.resolve(process.cwd(), '../satsangServiceAccount.json');
    if (fs.existsSync(filePath)) {
      credentialsJson = filePath;
    }
  }

  if (!credentialsJson) {
    // Try default Storage initialization (uses GOOGLE_APPLICATION_CREDENTIALS env var)
    console.log('[gcs-audio] No credentials found, using default Storage initialization');
    const storage = new Storage();
    return storage.bucket(GCS_BUCKET_NAME);
  }

  let credentials: any;
  
  if (isBase64 && typeof credentialsJson === 'string' && !credentialsJson.startsWith('{') && !fs.existsSync(credentialsJson)) {
    // It's a base64 encoded JSON string
    try {
      const decoded = Buffer.from(credentialsJson, 'base64').toString('utf8');
      credentials = JSON.parse(decoded);
      console.log('[gcs-audio] Decoded base64 credentials');
    } catch (e) {
      console.error('[gcs-audio] Failed to decode base64 credentials:', e);
      throw new Error('Invalid base64 GCP credentials format');
    }
  } else if (typeof credentialsJson === 'string' && credentialsJson.startsWith('{')) {
    // It's a JSON string
    try {
      credentials = JSON.parse(credentialsJson);
      console.log('[gcs-audio] Parsed JSON credentials from env var');
    } catch (e) {
      console.error('[gcs-audio] Failed to parse credentials JSON:', e);
      throw new Error('Invalid GCP credentials JSON format');
    }
  } else if (fs.existsSync(credentialsJson)) {
    // It's a file path
    try {
      credentials = JSON.parse(fs.readFileSync(credentialsJson, 'utf8'));
      console.log(`[gcs-audio] Loaded credentials from file: ${credentialsJson}`);
    } catch (e) {
      console.error('[gcs-audio] Failed to read credentials file:', e);
      throw new Error(`Failed to read GCP credentials file: ${credentialsJson}`);
    }
  } else {
    throw new Error('GCP credentials not found or invalid');
  }

  const storage = new Storage({ credentials });
  return storage.bucket(GCS_BUCKET_NAME);
}

export interface AudioFile {
  name: string;
  path: string;
  size: number;
  created: Date;
  url: string;
}

/**
 * List the last N MP3 files from Google Cloud Storage bucket
 */
export async function listRecentMP3Files(limit: number = 20): Promise<AudioFile[]> {
  try {
    const bucket = getGcsBucket();
    
    // List all files recursively - search in recordings/ subfolder where LiveKit egress stores files
    // Use prefix 'recordings/' to search in that folder and all subfolders
    const [files] = await bucket.getFiles({
      prefix: 'recordings/', // Search in recordings/ folder and all subfolders
      // Note: getFiles() already lists recursively by default when using a prefix
    });

    console.log(`[gcs-audio] Found ${files.length} total files in bucket (with prefix 'recordings/')`);

    // Filter MP3 files and sort by creation time
    const mp3Files = files
      .filter((file) => {
        const name = file.name.toLowerCase();
        return name.endsWith('.mp3') || name.endsWith('.m4a') || name.endsWith('.ogg');
      })
      .map((file) => {
        // Get metadata - need to fetch it if not already loaded
        const metadata = file.metadata;
        return {
          name: file.name.split('/').pop() || file.name,
          path: file.name,
          size: metadata?.size != null ? Number(metadata.size) : 0,
          created: metadata?.timeCreated 
            ? new Date(metadata.timeCreated) 
            : (metadata?.updated ? new Date(metadata.updated) : new Date()),
          url: `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${file.name}`,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()) // Newest first
      .slice(0, limit);

    console.log(`[gcs-audio] Found ${mp3Files.length} MP3 files (after filtering)`);

    return mp3Files;
  } catch (error: any) {
    console.error('[gcs-audio] Error listing MP3 files:', error);
    console.error('[gcs-audio] Error stack:', error.stack);
    throw new Error(`Failed to list MP3 files: ${error.message}`);
  }
}

/**
 * Download an MP3 file from GCS to a local temporary file
 */
export async function downloadMP3FromGCS(gcsPath: string, localPath: string): Promise<void> {
  try {
    const bucket = getGcsBucket();
    const file = bucket.file(gcsPath);
    
    await file.download({ destination: localPath });
  } catch (error: any) {
    console.error('[gcs-audio] Error downloading MP3:', error);
    throw new Error(`Failed to download MP3 from GCS: ${error.message}`);
  }
}

/**
 * Get a signed URL for an MP3 file (temporary access)
 */
export async function getMP3SignedUrl(gcsPath: string, expiresInMinutes: number = 60): Promise<string> {
  try {
    const bucket = getGcsBucket();
    const file = bucket.file(gcsPath);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    
    return url;
  } catch (error: any) {
    console.error('[gcs-audio] Error getting signed URL:', error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
}

