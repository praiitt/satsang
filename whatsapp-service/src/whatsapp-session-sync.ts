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

    const [exists] = await file.exists();
    if (!exists) {
      console.log('[SessionSync] No remote session found in GCS.');
      return false;
    }

    console.log('[SessionSync] Downloading remote session...');
    const tempZip = path.join(process.cwd(), 'session_tmp.zip');
    await file.download({ destination: tempZip });

    console.log('[SessionSync] Extracting session...');
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
    await extract(tempZip, { dir: path.resolve(SESSION_DIR, '..') });
    
    fs.unlinkSync(tempZip);
    console.log('[SessionSync] ✅ Session restored successfully.');
    return true;
  } catch (err) {
    console.error('[SessionSync] ❌ Failed to restore session:', err);
    return false;
  }
}

let isUploading = false;

export async function uploadSession(): Promise<void> {
  if (isUploading) {
    console.log('[SessionSync] Upload already in progress, skipping...');
    return;
  }
  isUploading = true;
  try {
    if (!fs.existsSync(SESSION_DIR)) {
        console.log('[SessionSync] No local session directory to upload.');
        return;
    }

    console.log('[SessionSync] Zipping session directory...');
    const tempZip = path.join(process.cwd(), 'session_upload.zip');
    const output = fs.createWriteStream(tempZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      // We need to add the folder itself or its contents
      // To match LocalAuth structure, we add the .wwebjs_auth folder's contents under a folder named .wwebjs_auth
      archive.directory(SESSION_DIR, '.wwebjs_auth');
      archive.finalize();
    });

    console.log('[SessionSync] Uploading session to GCS...');
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.upload(tempZip, {
      destination: SESSION_FILE,
      metadata: {
        contentType: 'application/zip',
        cacheControl: 'no-cache',
      },
    });

    fs.unlinkSync(tempZip);
    console.log('[SessionSync] ✅ Session uploaded successfully.');
  } catch (err) {
    console.error('[SessionSync] ❌ Failed to upload session:', err);
  } finally {
    isUploading = false;
  }
}
