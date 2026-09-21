import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import testRbacRoutes from './testRbacRoutes.js';

const apiRouter = Router();

// Mount Health Check endpoint
apiRouter.use('/health', healthRoutes);

// Mount Authentication routes
apiRouter.use('/auth', authRoutes);

// Mount RBAC Test verification routes
apiRouter.use('/test', testRbacRoutes);

// Placeholder mount points for future modules (Part 3 & Part 4)
// apiRouter.use('/titles', titleRoutes);
// apiRouter.use('/spaces', spaceRoutes);
// apiRouter.use('/admin', adminRoutes);
// apiRouter.use('/ai', aiRoutes);

export default apiRouter;
