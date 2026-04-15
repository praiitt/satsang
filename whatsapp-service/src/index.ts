import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 4002;

// CORS — allow any localhost port (for dev) + explicitly configured origins
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Always allow requests with no origin (curl, Postman, server-side)
    if (!origin) return callback(null, true);
    
    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Allow any localhost / 127.0.0.1 origin regardless of port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return callback(null, true);
    
    // Allow explicitly listed origins (also normalized)
    const isAllowed = allowedOrigins.some(ao => ao.replace(/\/$/, '') === normalizedOrigin);
    if (isAllowed) return callback(null, true);
    
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(null, false); // Deny but don't throw an error
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));


app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'whatsapp-service' }));

// Mount WhatsApp routes
app.use('/', routes);

// Error handler to ensure JSON error responses (and preserve headers)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Handled]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    service: 'whatsapp-service'
  });
});

app.listen(PORT, () => {
  console.log(`🟢 WhatsApp Service running on http://localhost:${PORT}`);
});
