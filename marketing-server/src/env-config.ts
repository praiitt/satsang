
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
const envPaths = [
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../.env.local'),
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        config({ path: envPath });
        console.log(`[marketing-server] ✅ Loaded .env.local from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    config();
    console.log('[marketing-server] ⚠️  Using default dotenv config (no .env.local found)');
}
