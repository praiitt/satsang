import { http } from '@google-cloud/functions-framework';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initFirebaseAdmin } from './firebase.js';
import authRoutes from './routes/auth.js';
import sunoRoutes from './routes/suno.js';
import tarotRoutes from './routes/tarot.js';
import coinRoutes from './routes/coins.js';

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
    console.log(`[auth-server] ✅ Loaded .env.local from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  config();
  console.log('[auth-server] ⚠️  Using default dotenv config (no .env.local found)');
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

// Only use express.json() when NOT running in Cloud Functions
// Cloud Functions v2 already parses the body, and calling express.json() causes "stream is not readable" error
if (!process.env.FUNCTION_TARGET) {
  app.use(express.json());
}

app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/suno', sunoRoutes);
app.use('/tarot', tarotRoutes);

app.get('/', (_req, res) => res.json({ name: 'satsang-auth-server', ok: true }));

// Register as Cloud Function
// For Cloud Functions v2, we need to handle the already-parsed body
http('authServer', (req, res) => {
  // If request has already been parsed by Cloud Functions, attach it to req.body
  if (req.body === undefined && (req as any).rawBody) {
    try {
      req.body = JSON.parse((req as any).rawBody.toString());
    } catch {
      req.body = {};
    }
  }

  // Ensure req.query exists (fix for "Cannot read properties of undefined (reading 'page')")
  if (!req.query) {
    console.log('[auth-server] ⚠️ req.query was undefined, polyfilling from URL');
    try {
      // req.url usually contains the path + query string in GCF/Express
      const queryString = (req.url || '').split('?')[1] || '';
      const searchParams = new URLSearchParams(queryString);
      const query: any = {};
      searchParams.forEach((value, key) => {
        query[key] = value;
      });
      req.query = query;
    } catch (e) {
      console.error('[auth-server] Failed to polyfill req.query', e);
      req.query = {};
    }
  }
  app(req, res);
});

// Start server locally if not in GCF
if (!process.env.FUNCTION_TARGET) {
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[auth-server] listening on http://localhost:${PORT}`);
  });

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
}
