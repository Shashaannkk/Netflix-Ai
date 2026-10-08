import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getUserDashboard,
  recordUserInteraction,
  deleteUserInteraction,
  clearUserHistory,
  getSpaceAnalytics,
} from '../controllers/dashboardController.js';

const router = Router();

// Require JWT Authentication for all user dashboard endpoints
router.use(authenticate);

// User Personal Dashboard & Recommendations
router.get('/user', getUserDashboard);
router.get('/', getUserDashboard);

// Record interaction data (watchedSeconds, completed, rating, etc.)
router.post('/interaction', recordUserInteraction);

// Manage Watch History entries
router.delete('/interaction/:id', deleteUserInteraction);
router.delete('/history', clearUserHistory);

// Watch Space Session Analytics
router.get('/analytics/:id', getSpaceAnalytics);

export default router;
