/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import { Storage, type StorageOptions } from '@google-cloud/storage';

function readFileIfExists(path: string | undefined): string | null {
  if (!path) return null;
  try {
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, 'utf8');
    }
  } catch {
    // ignore
  }
  return null;
}

function getGcpCredentialsJson(): string {
  // 1) Prefer inline env (raw JSON or base64)
  const inline = process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS;
  if (inline && inline.trim().length > 0) {
    if (inline.trim().startsWith('{')) return inline;
    return Buffer.from(inline, 'base64').toString('utf8');
  }

  // 2) GOOGLE_APPLICATION_CREDENTIALS path
  const gcpPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const gcpFile = readFileIfExists(gcpPath);
  if (gcpFile) return gcpFile;

  // 3) FIREBASE_SERVICE_ACCOUNT_PATH path (often reused)
  const fbPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const fbFile = readFileIfExists(fbPath);
  if (fbFile) return fbFile;

  throw new Error(
    'Missing credentials. Set LIVEKIT_EGRESS_GCP_CREDENTIALS (raw JSON or base64) or GOOGLE_APPLICATION_CREDENTIALS/FIREBASE_SERVICE_ACCOUNT_PATH to a JSON key file.'
  );
}

export function getGcsBucket() {
  const bucket = process.env.LIVEKIT_EGRESS_GCP_BUCKET;
  if (!bucket) throw new Error('LIVEKIT_EGRESS_GCP_BUCKET is not set');

  const credsJson = getGcpCredentialsJson();
  const creds = JSON.parse(credsJson) as any;

  const options: StorageOptions = {
    projectId: creds.project_id,
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
  };

  const storage = new Storage(options);
  return storage.bucket(bucket);
}
