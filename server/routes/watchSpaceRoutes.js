import { Router } from 'express';
import {
  createWatchSpace,
  getMySpaces,
  getWatchSpaceById,
  resolveInviteCode,
  joinWatchSpace,
  updateSpaceStatus,
  leaveWatchSpace,
  getSpaceMessages,
  getWatchSpaceState,
  endWatchSpace,
} from '../controllers/watchSpaceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// All Watch Space routes require authentication
router.use(requireAuth);

// ── Host actions ───────────────────────────────────────────────────────────────

// Create a new Watch Space
// POST /api/v1/watch-spaces or /api/spaces
router.post('/', createWatchSpace);

// Update status: scheduled → live or live → ended (host only, enforced in controller)
// PATCH /api/spaces/:id/status
router.patch('/:id/status', updateSpaceStatus);

// End Watch Space (Host or Admin)
// POST /api/v1/watch-spaces/:id/end
router.post('/:id/end', endWatchSpace);

// ── Participant actions ────────────────────────────────────────────────────────

// Resolve an invite code to a space preview (before joining)
// GET /api/spaces/join/:inviteCode
router.get('/join/:inviteCode', resolveInviteCode);

// Join a Watch Space by MongoDB ID
// POST /api/v1/watch-spaces/:id/join or /api/spaces/:id/join
router.post('/:id/join', joinWatchSpace);

// Leave a Watch Space (supports both POST and DELETE)
// POST /api/v1/watch-spaces/:id/leave
// DELETE /api/spaces/:id/leave
router.post('/:id/leave', leaveWatchSpace);
router.delete('/:id/leave', leaveWatchSpace);

// ── Shared ─────────────────────────────────────────────────────────────────────

// Get all spaces the current user is host or participant in
// GET /api/spaces/my
router.get('/my', getMySpaces);

// Get chat history for a Watch Space
// GET /api/v1/watch-spaces/:id/messages
router.get('/:id/messages', getSpaceMessages);

// Get Watch Space in-memory / session state
// GET /api/v1/watch-spaces/:id/state
router.get('/:id/state', getWatchSpaceState);

// Get a single space by ID (accessible to host, participants, admins)
// GET /api/v1/watch-spaces/:id
router.get('/:id', getWatchSpaceById);

export default router;

