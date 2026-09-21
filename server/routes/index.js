import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const apiRouter = Router();

// Mount Health Check endpoint
apiRouter.use('/health', healthRoutes);

// Placeholder mount points for future modules (Part 2 - Part 4)
// apiRouter.use('/auth', authRoutes);
// apiRouter.use('/titles', titleRoutes);
// apiRouter.use('/spaces', spaceRoutes);
// apiRouter.use('/admin', adminRoutes);
// apiRouter.use('/ai', aiRoutes);

export default apiRouter;
