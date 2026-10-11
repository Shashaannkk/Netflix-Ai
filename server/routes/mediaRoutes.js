import { Router } from 'express';
import { streamWatchTogetherDemo, streamKantaraMovie } from '../controllers/mediaController.js';

const router = Router();

// Bit-by-bit Range video streaming endpoints for Watch Together
router.get('/watch-together-demo.mp4', streamWatchTogetherDemo);
router.get('/watch-together-demo', streamWatchTogetherDemo);
router.get('/kantara', streamKantaraMovie);
router.get('/kantara-chapter-1.mp4', streamKantaraMovie);

export default router;
