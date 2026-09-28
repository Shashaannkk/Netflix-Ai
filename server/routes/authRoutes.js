import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  getMe
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', requireAuth, getMe);

export default router;
