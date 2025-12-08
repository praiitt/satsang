import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import astrologyRoutes from './routes/astrology.js';
// import wellnessRoutes from './routes/wellness.js';
import chatRoutes from './routes/chat.js';
import compatibilityRoutes from './routes/compatibility.js';
import matchmakingRoutes from './routes/matchmaking.js';
import userJourneyRoutes from './routes/userJourney.js';
import enhancedChatRoutes from './routes/enhancedChat.js';
import userProfileRoutes from './routes/userProfile.js';
import ragRoutes from './routes/rag.js';
import hybridRagRoutes from './routes/hybridRag.js';
import authRoutes from './routes/auth.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Rate limiting - TEMPORARILY DISABLED for testing
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Temporarily increased for testing
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(limiter);
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
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

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Rraasi Backend Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export { app, io }; 