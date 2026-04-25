import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

const storage = new Storage();
const BUCKET_NAME = process.env.WHATSAPP_SESSION_BUCKET || 'rraasi-whatsapp-session';

async function run() {
  try {
    console.log('Deleting from GCS...');
    await storage.bucket(BUCKET_NAME).file('session.zip').delete({ ignoreNotFound: true });
    console.log('Deleted from GCS.');
  } catch (e: any) {
    console.log('GCS Delete Error:', e.message);
  }

  const localDir = path.join(process.cwd(), '.wwebjs_auth');
  if (fs.existsSync(localDir)) {
    console.log('Deleting local .wwebjs_auth...');
    fs.rmSync(localDir, { recursive: true, force: true });
    console.log('Deleted local .wwebjs_auth.');
  }
}

run();
