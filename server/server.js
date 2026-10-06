import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocketHandler } from './sockets/socketHandler.js';
import { seedUserInteractionsData } from './data/seedInteractions.js';
import { seedTitlesData } from './data/seedTitles.js';
import { validateEnvironment } from './utils/envValidator.js';

// Perform startup env validation
validateEnvironment();

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or requests without origin header (e.g. Postman, curl, mobile)
    if (!origin) return callback(null, true);
    if (
      origin === CLIENT_URL ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly permissive CORS
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

app.use(cors(corsOptions));

// 2. Cookie & Body Parsing Middleware
app.use(cookieParser(process.env.COOKIE_SECRET || 'netflix-secret'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Mount REST API Routes & Static Local Media Stream Endpoint
app.use('/api', apiRouter);
app.use('/media', express.static(path.join(__dirname, '..')));

// Root route greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Netflix AI Watch Spaces API Server',
    status: 'online',
    docs: '/api/health'
  });
});

// 4. Centralized Error Handlers (must come after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// 5. Create HTTP Server and bind Socket.IO
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.IO connection handlers
initSocketHandler(io);

// Global exception & rejection listeners to prevent live server process crashes
process.on('uncaughtException', (err) => {
  console.error('[Fatal Error] Uncaught Exception:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

// 6. Connect Database and Start Server
const startServer = async () => {
  // Ensure safe fallback environment variables if missing (prevents crashes in live environments)
  if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'netflix_ai_access_token_secret_development_key_12345';
    console.warn('⚠️ [Server Warning] JWT_ACCESS_SECRET missing. Using default fallback key.');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'netflix_ai_refresh_token_secret_development_key_67890';
    console.warn('⚠️ [Server Warning] JWT_REFRESH_SECRET missing. Using default fallback key.');
  }

  // Start HTTP Server and bind Socket.IO immediately
  if (!process.env.VERCEL) {
    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Netflix AI Watch Spaces Server is running!`);
      console.log(`📡 HTTP API:        http://localhost:${PORT}/api/health`);
      console.log(`⚡ WebSocket URL:   ws://localhost:${PORT}`);
      console.log(`🌐 Allowed Client:  ${CLIENT_URL}`);
      console.log(`====================================================`);
    });
  }

  // Connect to MongoDB & seed data asynchronously
  await connectDB();
  await seedTitlesData();
  await seedUserInteractionsData();
};

// Only auto-start HTTP listener and seeding when running as a standalone server (not on Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app, server, io };
