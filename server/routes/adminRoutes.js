import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import {
  validateTitleTimeline,
  updateTitleTimeline,
} from '../controllers/adminController.js';

const router = Router();

// Protect ALL admin routes with server-side RBAC middleware (JWT Auth + Admin role)
router.use(authenticate);
router.use(requireRole('admin'));

// Validate timeline JSON schema without saving
router.post('/titles/:id/timeline/validate', validateTitleTimeline);

// Update title timeline metadata (Save valid timeline)
router.put('/titles/:id/timeline', updateTitleTimeline);

export default router;
