import { Router } from 'express';
import { isDbConnected } from '../config/db.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Comprehensive system and database health check
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatus = isDbConnected();

  const healthData = {
    service: 'Netflix AI Watch Spaces API',
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus ? 'connected' : 'disconnected',
      connected: dbStatus,
      uriConfigured: !!process.env.MONGO_URI
    },
    envChecks: {
      jwtAccessSecret: !!process.env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
    },
    version: '1.0.0'
  };

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Health check passed',
    data: healthData
  });
});

export default router;
