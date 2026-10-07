import { Router } from 'express';
import { streamKantaraMovie } from '../controllers/mediaController.js';

const router = Router();

// Bit-by-bit Range video streaming endpoint for Kantara Chapter 1
router.get('/kantara', streamKantaraMovie);
router.get('/kantara-chapter-1-demo', streamKantaraMovie);
router.get('/Kantara-Chapter.1.2025.1080p.WEB-DL.Hindi.5.1-Kannad.mkv', streamKantaraMovie);

export default router;
