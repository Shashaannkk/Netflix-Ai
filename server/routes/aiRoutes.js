import { Router } from 'express';
import { askAiCoPilot } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// All AI Co-Pilot endpoints require authentication
router.use(requireAuth);

// POST /api/v1/watch-spaces/:id/ai/ask
// POST /api/spaces/:id/ai/ask
router.post('/:id/ai/ask', askAiCoPilot);

export default router;
