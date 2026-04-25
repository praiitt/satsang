import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import extract from 'extract-zip';

const storage = new Storage();
const BUCKET_NAME = process.env.WHATSAPP_SESSION_BUCKET || 'rraasi-whatsapp-session';
const SESSION_FILE = 'session.zip';
const SESSION_DIR = path.join(process.cwd(), '.wwebjs_auth');

export async function downloadSession(): Promise<boolean> {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(SESSION_FILE);

    console.log('[SessionSync] Force-deleting remote session from GCS to clear corruption...');
    await file.delete({ ignoreNotFound: true }).catch(() => {});

    if (fs.existsSync(SESSION_DIR)) {
      console.log('[SessionSync] Force-deleting local .wwebjs_auth...');
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
    
    console.log('[SessionSync] Corrupted session cleared. Session Sync is now disabled to prevent crashes.');
    return false;
  } catch (err) {
    console.error('[SessionSync] Failed to clear session:', err);
    return false;
  }
}

let isUploading = false;

export async function uploadSession(): Promise<void> {
  console.log('[SessionSync] Session upload is disabled to prevent Chrome lockfile corruption.');
  return;
}
