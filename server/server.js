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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. CORS Configuration
const corsOptions = {
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));

// 2. Cookie & Body Parsing Middleware
app.use(cookieParser(process.env.COOKIE_SECRET || 'netflix-secret'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Mount REST API Routes
app.use('/api', apiRouter);

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

// 6. Connect Database and Start Server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Netflix AI Watch Spaces Server is running!`);
    console.log(`📡 HTTP API:        http://localhost:${PORT}/api/health`);
    console.log(`⚡ WebSocket URL:   ws://localhost:${PORT}`);
    console.log(`🌐 Allowed Client:  ${CLIENT_URL}`);
    console.log(`====================================================`);
  });
};

startServer();

export { app, server, io };
