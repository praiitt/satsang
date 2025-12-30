
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.config({ path: envPath }).parsed;

if (!envConfig) {
    console.warn('Could not parse .env.local - Proceeding with empty environment config (relying on file access or defaults)');
    // envConfig = {}; // we can't assign to const.
    // We need to handle this.
    // Instead of exiting, we can just use empty object for the mapping loop.
}
const configToUse = envConfig || {};

// Map of keys we want to pass to Cloud Functions
// mapping: [Local Key] -> [Remote Key]
const keyMapping = {
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID': 'FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL': 'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY': 'FIREBASE_PRIVATE_KEY',
    'SUNO_API_KEY': 'SUNO_API_KEY'
};

const vars = [];
vars.push(`NODE_ENV=production`);
vars.push(`CORS_ORIGIN=https://rraasi.com`);

for (const [localKey, remoteKey] of Object.entries(keyMapping)) {
    const value = configToUse[localKey];
    if (value) {
        // We assume gcloud handles values. But for safety, we might need to handle escaping?
        // gcloud --set-env-vars takes KEY=VALUE,KEY2=VALUE2
        // If VALUE contains commas, it might break.
        // If VALUE contains newlines (private key), it DEFINITELY breaks if not careful.
        // For Private Key, it's often better to just replace actual newlines with literal "\n" string
        // because that's what many libraries expect (JSON.parse-able).

        let safeValue = value;
        if (localKey === 'FIREBASE_PRIVATE_KEY') {
            safeValue = safeValue.replace(/\n/g, '\\n');
        }

        // Check if comma exists, if so we might need another strategy or hope gcloud handles it.
        // Actually gcloud --set-env-vars allows using a file: --env-vars-file FILE
        // which is SAFER.
    }
}

// Better strategy: Generate a YAML file for gcloud
const envVars = {
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://rraasi.com'
};

for (const [localKey, remoteKey] of Object.entries(keyMapping)) {
    if (configToUse[localKey]) {
        envVars[remoteKey] = configToUse[localKey];
    }
}

const yamlContent = Object.entries(envVars)
    .map(([k, v]) => `${k}: "${v.replace(/"/g, '\\"')}"`) // Simple YAML-ish serialization
    .join('\n');

// Actually, let's just write to .env.yaml and use --env-vars-file
fs.writeFileSync(path.resolve(__dirname, '../.env.yaml'), yamlContent);
console.log('Created .env.yaml for deployment');
