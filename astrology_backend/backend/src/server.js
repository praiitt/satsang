import './config/initEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import astrologyRoutes from './routes/astrology.js';
import comprehensiveAstrologyRoutes from './routes/comprehensiveAstrology.js';
import chartManagementRoutes from './routes/chartManagement.js';
// import wellnessRoutes from './routes/wellness.js';
import chatRoutes from './routes/chat.js';
import compatibilityRoutes from './routes/compatibility.js';
import matchmakingRoutes from './routes/matchmaking.js';
import userJourneyRoutes from './routes/userJourney.js';
import enhancedChatRoutes from './routes/enhancedChat.js';
import userProfileRoutes from './routes/userProfile.js';
import ragRoutes from './routes/rag.js';
import hybridRagRoutes from './routes/hybridRag.js';
// PineconeSearch routes - load optionally (may not exist in all deployments)
let pineconeSearchRoutesPromise = null;
try {
  pineconeSearchRoutesPromise = import('./routes/pineconeSearch.js').catch(() => null);
} catch {
  pineconeSearchRoutesPromise = Promise.resolve(null);
}
import authRoutes from './routes/auth.js';
import paymentsRoutes from './routes/payments.js';
import waitlistRoutes from './routes/waitlist.js';
import adminRoutes from './routes/admin.js';
import coinRoutes from './routes/coins.js';
import pdfDownloadRoutes from './routes/pdfDownload.js';
import geocodingRoutes from './routes/geocoding.js';
// Import services
import { langChainService } from './services/langchainService.js';
import { scheduledTasksService } from './services/scheduledTasksService.js';
import { HEALTH_CHECK_URL } from './config/environment.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Load environment variables from the correct path (optional - will use existing env vars if .env doesn't exist)
try {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} catch (error) {
  // .env file not required - environment variables may be set via apphosting.yaml or other means
  logger.info('No .env file found, using environment variables from apphosting.yaml or system');
}

const app = express();

import livekitRoutes from './routes/livekit.js';
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3003;

// Rate limiting - TEMPORARILY DISABLED for testing
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Temporarily increased for testing
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS Configuration - properly handle production frontend URL (must be before other middleware)
const allowedOrigins = [
  'https://rraasi.web.app',
  'https://rraasi.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Middleware - helmet after CORS to avoid interference
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
// app.use(limiter); // Temporarily disabled for testing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/astrology', astrologyRoutes);
app.use('/api/comprehensive-astrology', comprehensiveAstrologyRoutes);
app.use('/api/chart-management', chartManagementRoutes);
// app.use('/api/wellness', wellnessRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/user-journey', userJourneyRoutes);
app.use('/api/enhanced-chat', enhancedChatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/hybrid-rag', hybridRagRoutes);

// Register PineconeSearch routes when they're loaded (non-blocking, optional)
if (pineconeSearchRoutesPromise) {
  pineconeSearchRoutesPromise.then(pineconeModule => {
    if (pineconeModule?.default) {
      app.use('/api/pinecone', pineconeModule.default);
      logger.info('PineconeSearch routes loaded and registered successfully');
    }
  }).catch(() => {
    logger.warn('PineconeSearch routes not available, continuing without them');
  });
}

app.use('/api/payments', paymentsRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/pdf', pdfDownloadRoutes);
app.use('/api/geocoding', geocodingRoutes);

// Register LiveKit routes
app.use('/api/livekit', livekitRoutes);
logger.info('LiveKit routes registered');

// Admin routes (protected)
app.use('/api/admin', adminRoutes);

// LangChain specific routes
app.use('/api/langchain', (req, res, next) => {
  req.langchain = true;
  next();
}, chatRoutes);

// Socket.IO for real-time features
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-chat', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined chat room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server - bind to 0.0.0.0 to listen on all interfaces (required for Cloud Run)
try {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Rraasi Backend Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`🌐 App Engine: ${process.env.GAE_SERVICE ? 'Yes' : 'No'}`);

    // Initialize services in background (non-blocking, don't await)
    // This allows the server to start immediately and pass health checks
    Promise.all([
      Promise.resolve().then(() => {
        try {
          langChainService.initialize();
          logger.info('✅ LangChain service initialized successfully');
        } catch (error) {
          logger.error('❌ Failed to initialize LangChain service:', error);
        }
      }),
      Promise.resolve().then(() => {
        try {
          scheduledTasksService.start();
          logger.info('✅ Scheduled tasks service initialized successfully');
        } catch (error) {
          logger.error('❌ Failed to initialize scheduled tasks service:', error);
        }
      })
    ]).catch(err => {
      logger.error('Error during service initialization:', err);
      // Don't crash - services can initialize later
    });
  });

  // Handle server errors
  server.on('error', (error) => {
    logger.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
    } else {
      logger.error('Unexpected server error:', error);
    }
    process.exit(1);
  });
} catch (error) {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export { app, io }; 