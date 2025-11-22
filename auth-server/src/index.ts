import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initFirebaseAdmin } from './firebase.js';
import adsRoutes from './routes/ads.js';
import authRoutes from './routes/auth.js';
import podcastRoutes from './routes/podcast.js';
import transcriptRoutes from './routes/transcript.js';
import transcriptsRoutes from './routes/transcripts.js';
import videoStitchRoutes from './routes/video-stitch.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root (not auth-server root)
// Try multiple paths to handle different execution contexts
const envPaths = [
  path.resolve(process.cwd(), '../.env.local'), // If running from auth-server/
  path.resolve(process.cwd(), '.env.local'), // If running from project root
  path.resolve(__dirname, '../../.env.local'), // Relative to compiled dist/
  path.resolve(__dirname, '../.env.local'), // Relative to source src/
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`[auth-server] ✅ Loaded .env.local from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  // Fallback to default dotenv behavior
  config();
  console.log('[auth-server] ⚠️  Using default dotenv config (no .env.local found)');
  console.log('[auth-server] Searched paths:', envPaths);
}

// Verify critical env vars are loaded
if (!process.env.OPENAI_API_KEY) {
  console.warn('[auth-server] ⚠️  OPENAI_API_KEY is not set in environment variables');
  console.warn('[auth-server] Current working directory:', process.cwd());
  console.warn('[auth-server] __dirname:', __dirname);
} else {
  console.log('[auth-server] ✅ OPENAI_API_KEY is set');
}

const app = express();

initFirebaseAdmin();

const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: ORIGIN === '*' ? true : ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/ads', adsRoutes);
app.use('/transcript', transcriptRoutes);
app.use('/transcripts', transcriptsRoutes);
app.use('/podcast', podcastRoutes);
app.use('/video-stitch', videoStitchRoutes);

app.get('/', (_req, res) => res.json({ name: 'satsang-auth-server', ok: true }));

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[auth-server] listening on http://localhost:${PORT}`);
});

// Handle port conflicts gracefully
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(
      `[auth-server] Port ${PORT} is already in use. Please stop the existing server first.`
    );
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.error('[auth-server] Server error:', err);
    throw err;
  }
});
