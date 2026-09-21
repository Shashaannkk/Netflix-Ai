import { Router } from 'express';
import { requireAuth, authorizeRoles } from '../middleware/authMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

/**
 * @route   GET /api/test/viewer
 * @desc    Test endpoint accessible to all authenticated users (viewer, host, admin)
 * @access  Private (viewer, host, admin)
 */
router.get('/viewer', requireAuth, authorizeRoles('viewer', 'host', 'admin'), (req, res) => {
  return sendSuccess(res, {
    message: 'Viewer access granted',
    data: {
      user: req.user,
      permissionLevel: 'viewer',
      allowedActions: ['join_space', 'watch_video', 'send_chat', 'react_emoji', 'vote_poll']
    }
  });
});

/**
 * @route   GET /api/test/host
 * @desc    Test endpoint accessible only to hosts and admins
 * @access  Private (host, admin)
 */
router.get('/host', requireAuth, authorizeRoles('host', 'admin'), (req, res) => {
  return sendSuccess(res, {
    message: 'Host access granted',
    data: {
      user: req.user,
      permissionLevel: 'host',
      allowedActions: ['create_space', 'control_playback', 'kick_participant', 'trigger_trivia']
    }
  });
});

/**
 * @route   GET /api/test/admin
 * @desc    Test endpoint accessible strictly to admins
 * @access  Private (admin only)
 */
router.get('/admin', requireAuth, authorizeRoles('admin'), (req, res) => {
  return sendSuccess(res, {
    message: 'Admin access granted',
    data: {
      user: req.user,
      permissionLevel: 'admin',
      allowedActions: ['upload_timeline_json', 'validate_metadata', 'manage_all_spaces', 'delete_users']
    }
  });
});

export default router;
