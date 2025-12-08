import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately
// This must be imported before any other modules that rely on process.env
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('✅ Environment variables loaded via initEnv.js');
