const fs = require('fs');
const path = require('path');
const serviceAccount = require('../rraasiServiceAccount.json');

const envs = {
    LIVEKIT_URL: 'wss://satsang-o9gv57vl.livekit.cloud',
    LIVEKIT_API_KEY: 'APILWdFRxKrWtVF',
    LIVEKIT_API_SECRET: 'M1SaLkufZVnTEB48orcnB0VsuFMwBWWvJ7y8yQG0oJG',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBkxVOuhaVrU3Xz5M1_v0iWKKRQUwWd3TU',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'rraasi-8a619.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'rraasi-8a619',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'rraasi-8a619.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '469389287554',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:469389287554:web:4482647b3c865a9d2b949b',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-KNZ2VKQ9BH',
    AUTH_SERVER_URL: 'https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-auth-server',
    MARKETING_SERVER_URL: 'http://localhost:4001',
    BACKEND_SERVICE_URL: 'https://rraasi.com',
    NEXT_PUBLIC_ASSET_PREFIX: 'https://satsang-frontend-469389287554.asia-south1.run.app',
    // Encode as base64 to avoid string escaping hell
    LIVEKIT_EGRESS_GCP_CREDENTIALS: Buffer.from(JSON.stringify(serviceAccount)).toString('base64'),
    LIVEKIT_EGRESS_GCP_BUCKET: 'rraasi-8a619.firebasestorage.app',
    LIVEKIT_EGRESS_ENABLED: 'true'
};

const yamlContent = Object.entries(envs).map(([k, v]) => `${k}: '${v}'`).join('\n');

fs.writeFileSync(path.join(__dirname, '../frontend-env-final.yaml'), yamlContent);
console.log('Generated frontend-env-final.yaml');
