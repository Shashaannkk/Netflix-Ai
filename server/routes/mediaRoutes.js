import { Router } from 'express';
import { streamKantaraMovie } from '../controllers/mediaController.js';

const router = Router();

// Bit-by-bit Range video streaming endpoint for Watch Together Demo
router.get('/watch-together-demo.mp4', streamKantaraMovie);
router.get('/watch-together-demo', streamKantaraMovie);
router.get('/kantara', streamKantaraMovie);
router.get('/kantara-chapter-1.mp4', streamKantaraMovie);

export default router;
