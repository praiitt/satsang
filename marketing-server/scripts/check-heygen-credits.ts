
import https from 'node:https';
import 'dotenv/config';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

async function httpRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    // DO NOT prepend /v2 if it's already there or if it's v1
    let fullPath = path;
    
    // If using sk_V2_ and path doesn't start with /v1/ or /v2/, prepend /v2/
    if (HEYGEN_API_KEY?.startsWith('sk_V2_') && !fullPath.startsWith('/v1/') && !fullPath.startsWith('/v2/')) {
        fullPath = '/v2' + fullPath;
    }

    console.log(`📡 Request: ${method} https://api.heygen.com${fullPath}`);

    const options = {
      hostname: 'api.heygen.com',
      path: fullPath,
      method: method,
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': HEYGEN_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('--- HeyGen Credit Check ---');
  if (!HEYGEN_API_KEY) {
    console.error('HEYGEN_API_KEY not found');
    return;
  }

  // Check user info
  console.log('\nChecking user info...');
  const userResult = await httpRequest('/v2/user/info');
  console.log('Status:', userResult.status);
  console.log('Data:', JSON.stringify(userResult.data, null, 2));

  // Check remaining credits (if endpoint exists)
  console.log('\nChecking remaining credits...');
  const creditResult = await httpRequest('/v1/remaining_credits');
  console.log('Status:', creditResult.status);
  console.log('Data:', JSON.stringify(creditResult.data, null, 2));
}

main();
