'use strict';

/**
 * Script to list all HeyGen talking photos (photo avatars) for the user's account.
 * 
 * Usage:
 *   HEYGEN_API_KEY=sk_xxx tsx scripts/list-heygen-talking-photos.ts
 */

import 'dotenv/config';
import https from 'node:https';

const API_KEY = process.env.HEYGEN_API_KEY || '';
const BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

if (!API_KEY) {
  console.error('❌ HEYGEN_API_KEY env var is required');
  process.exit(1);
}

interface HttpMethod {
  method: 'GET' | 'POST';
  path: string;
}

function httpRequest<T = any>(method: 'GET' | 'POST', path: string): Promise<T> {
  const url = new URL(BASE_URL);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': API_KEY,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            try {
              const parsed = JSON.parse(data);
              const msg =
                parsed?.message ||
                parsed?.error?.message ||
                parsed?.error ||
                `HTTP ${res.statusCode}`;
              return reject(
                Object.assign(new Error(msg), { statusCode: res.statusCode, details: parsed })
              );
            } catch {
              return reject(
                Object.assign(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`), {
                  statusCode: res.statusCode,
                  details: data,
                })
              );
            }
          }

          if (!data) {
            return resolve(undefined as T);
          }

          try {
            resolve(JSON.parse(data) as T);
          } catch (error) {
            reject(new Error(`Invalid JSON: ${String(error)} \n${data.slice(0, 200)}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function listTalkingPhotos() {
  console.log('🔍 Fetching HeyGen talking photos...\n');
  console.log(`🔑 Key prefix: ${API_KEY.slice(0, 10)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  // Try multiple possible endpoints for listing talking photos/photo avatars
  const candidatePaths = [
    '/v2/talking_photos', // Most likely for v2 API
    '/v1/talking_photos',
    '/talking_photos',
    '/v2/photo_avatars',
    '/v1/photo_avatars',
    '/photo_avatars',
    '/v2/avatars?type=talking_photo', // With query param
    '/v1/avatars?type=talking_photo',
    '/v2/avatars', // List all avatars (might include talking photos)
    '/v1/avatars',
  ];

  for (const path of candidatePaths) {
    try {
      console.log(`📡 Trying GET ${path}...`);
      const response = await httpRequest<any>('GET', path);
      
      // Try to extract talking photos from various response formats
      let talkingPhotos: any[] = [];
      
      if (response?.data?.talking_photos) {
        talkingPhotos = response.data.talking_photos;
      } else if (response?.data?.photo_avatars) {
        talkingPhotos = response.data.photo_avatars;
      } else if (response?.data?.avatars) {
        // Filter for talking photos if type field exists
        talkingPhotos = Array.isArray(response.data.avatars)
          ? response.data.avatars.filter((a: any) => 
              a.type === 'talking_photo' || 
              a.avatar_type === 'talking_photo' ||
              a.talking_photo_id
            )
          : [];
      } else if (response?.talking_photos) {
        talkingPhotos = response.talking_photos;
      } else if (response?.photo_avatars) {
        talkingPhotos = response.photo_avatars;
      } else if (Array.isArray(response?.data)) {
        talkingPhotos = response.data;
      } else if (Array.isArray(response)) {
        talkingPhotos = response;
      }

      if (talkingPhotos.length > 0) {
        console.log(`\n✅ Found ${talkingPhotos.length} talking photo(s) via ${path}\n`);
        console.log('📋 Your Talking Photos:\n');
        
        talkingPhotos.forEach((photo, index) => {
          const id = photo.talking_photo_id || photo.id || photo.avatar_id || photo.photo_avatar_id;
          const name = photo.name || photo.avatar_name || photo.talking_photo_name || 'Unnamed';
          const status = photo.status || photo.avatar_status || '';
          const createdAt = photo.created_at || photo.createdAt || '';
          
          console.log(`${index + 1}. ${name}`);
          console.log(`   ID: ${id}`);
          if (status) console.log(`   Status: ${status}`);
          if (createdAt) console.log(`   Created: ${createdAt}`);
          console.log('');
        });

        // Also output as JSON for easy copying
        console.log('\n📋 JSON Format (for easy copying):\n');
        const jsonOutput = talkingPhotos.map((photo) => ({
          id: photo.talking_photo_id || photo.id || photo.avatar_id || photo.photo_avatar_id,
          name: photo.name || photo.avatar_name || photo.talking_photo_name || 'Unnamed',
          status: photo.status || photo.avatar_status,
          created_at: photo.created_at || photo.createdAt,
        }));
        console.log(JSON.stringify(jsonOutput, null, 2));
        
        return talkingPhotos;
      } else if (response && typeof response === 'object') {
        console.log(`⚠️  Got response from ${path} but no talking photos found`);
        console.log(`Response structure:`, JSON.stringify(response, null, 2).slice(0, 500));
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ ${path} → 404 (endpoint not found)`);
      } else {
        console.log(`❌ ${path} → ${error.message}`);
      }
      continue;
    }
  }

  console.log('\n❌ Could not find talking photos endpoint. Tried all candidate paths.');
  console.log('💡 You may need to check HeyGen API docs for the correct endpoint.');
  return [];
}

async function main() {
  try {
    await listTalkingPhotos();
  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();

