import { Router } from 'express';
import {
  getTitles,
  getTitleById,
  getTitleTimeline,
  getTimelineRange,
  createTitle,
  updateTitle,
} from '../controllers/titleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// ── Public routes (no auth required) ──────────────────────────────────────────
// GET /api/titles              — browse catalogue
router.get('/', getTitles);

// GET /api/titles/:id          — title details page
router.get('/:id', getTitleById);

// ── Authenticated routes (valid JWT required) ──────────────────────────────────
// GET /api/titles/:id/timeline       — full timeline (used by video player to render markers)
router.get('/:id/timeline', requireAuth, getTitleTimeline);

// GET /api/titles/:id/timeline/range — bounded context window (used by AI engine)
// ?start=0&end=300&type=trivia
router.get('/:id/timeline/range', requireAuth, getTimelineRange);

// ── Admin-only routes ──────────────────────────────────────────────────────────
// POST /api/titles             — create a new title
router.post('/', requireAuth, authorizeRoles('admin'), createTitle);

// PUT /api/titles/:id          — update title metadata or publish
router.put('/:id', requireAuth, authorizeRoles('admin'), updateTitle);

export default router;
