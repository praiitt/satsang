
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root or local dir
const envPaths = [
    path.resolve(process.cwd(), '.env.local'),           // marketing-server/
    path.resolve(process.cwd(), '.env'),                  // marketing-server/.env
    path.resolve(process.cwd(), '../.env.local'),         // satsangapp/
    path.resolve(__dirname, '../.env.local'),             // one level up from src/
    path.resolve(__dirname, '../../.env.local'),          // two levels up
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        config({ path: envPath, override: false });
        console.log(`[marketing-server] ✅ Loaded env from: ${envPath}`);
        envLoaded = true;
        // don't break — load all found files (later entries don't override earlier ones)
    }
}

if (!envLoaded) {
    config();
    console.log('[marketing-server] ⚠️  Using default dotenv config (no .env* found)');
}

// Debug: print key env vars
console.log('[marketing-server] INTERNAL_SERVICE_TOKEN present:', !!process.env.INTERNAL_SERVICE_TOKEN);
