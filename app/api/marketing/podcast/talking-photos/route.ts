/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

function httpRequest<T = any>(method: 'GET' | 'POST', path: string): Promise<T> {
  const url = new URL(HEYGEN_BASE_URL);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': HEYGEN_API_KEY || '',
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

export async function GET(request: NextRequest) {
  void request;
  if (!HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: 'HEYGEN_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Try the endpoint that worked in the script
    const response = await httpRequest<any>('GET', '/v2/avatars');
    
    // Extract talking photos from response
    let talkingPhotos: any[] = [];
    
    if (response?.data?.avatars) {
      talkingPhotos = Array.isArray(response.data.avatars)
        ? response.data.avatars
        : [];
    } else if (Array.isArray(response?.data)) {
      talkingPhotos = response.data;
    } else if (Array.isArray(response)) {
      talkingPhotos = response;
    }

    // Format for frontend
    // Check if photo is user's own (has created_by, is_public: false, or other indicators)
    const formatted = talkingPhotos.map((photo) => {
      const id = photo.talking_photo_id || photo.id || photo.avatar_id || photo.photo_avatar_id;
      const name = photo.name || photo.avatar_name || photo.talking_photo_name || 'Unnamed';
      
      // Determine if it's user's own photo or public
      // Heuristics:
      // 1. If is_public is explicitly false, it's user's own
      // 2. If created_by or user_id exists, it's user's own
      // 3. If avatar_id starts with common patterns (like UUIDs or user-specific IDs), it might be user's own
      // 4. Default HeyGen avatars typically have simple names like "Abigail_standing_office_front"
      // 5. User's own photos might have UUID-like IDs or different naming patterns
      
      let isPublic = true; // Default to public
      
      if (photo.is_public === false) {
        isPublic = false; // Explicitly marked as private/user's own
      } else if (photo.created_by || photo.user_id || photo.owner_id) {
        isPublic = false; // Has ownership indicators
      } else if (id && id.length > 32 && /^[a-f0-9-]{32,}$/i.test(id)) {
        // UUID-like IDs are often user-created
        isPublic = false;
      } else if (id && (id.includes('_') && id.split('_').length <= 3)) {
        // Simple names like "Abigail_standing_office" are typically public/default avatars
        isPublic = true;
      }
      
      return {
        id,
        name,
        isPublic,
        type: photo.type || photo.avatar_type || 'unknown',
      };
    }).filter((p) => p.id); // Only include items with valid IDs

    return NextResponse.json({ talkingPhotos: formatted });
  } catch (error: any) {
    console.error('[talking-photos] Error fetching:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch talking photos' },
      { status: 500 }
    );
  }
}

