/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EgressClient } from 'livekit-server-sdk';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getEgressClient() {
  const host = process.env.LIVEKIT_HOST || process.env.LIVEKIT_URL;
  if (!host) {
    throw new Error('Missing env: LIVEKIT_HOST or LIVEKIT_URL');
  }
  const apiKey = required('LIVEKIT_API_KEY');
  const apiSecret = required('LIVEKIT_API_SECRET');
  return new EgressClient(host, apiKey, apiSecret);
}

export function getGcpUploadConfig() {
  const bucket = required('LIVEKIT_EGRESS_GCP_BUCKET');
  const credentials = required('LIVEKIT_EGRESS_GCP_CREDENTIALS'); // JSON string or base64
  const pathPrefix = process.env.LIVEKIT_EGRESS_GCP_PREFIX ?? 'recordings';

  let credsJson = credentials;
  try {
    // If base64, decode
    if (!credentials.trim().startsWith('{')) {
      credsJson = Buffer.from(credentials, 'base64').toString('utf8');
    }
    JSON.parse(credsJson);
  } catch (_e) {
    throw new Error('LIVEKIT_EGRESS_GCP_CREDENTIALS is not valid JSON or base64-encoded JSON');
  }

  return { bucket, credentials: credsJson, pathPrefix };
}
