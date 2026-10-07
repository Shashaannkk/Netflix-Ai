import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import testRbacRoutes from './testRbacRoutes.js';
import titleRoutes from './titleRoutes.js';
import watchSpaceRoutes from './watchSpaceRoutes.js';
import aiRoutes from './aiRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import adminRoutes from './adminRoutes.js';
import mediaRoutes from './mediaRoutes.js';

const apiRouter = Router();

// Mount Health Check endpoint
apiRouter.use('/health', healthRoutes);

// Mount Media Range Stream routes
apiRouter.use('/media', mediaRoutes);

// Mount Authentication routes
apiRouter.use('/auth', authRoutes);

// Mount RBAC Test verification routes
apiRouter.use('/test', testRbacRoutes);

// Mount Title Catalogue routes (Part 3)
apiRouter.use('/titles', titleRoutes);

// Mount Watch Space routes (Part 4 & PRD API)
apiRouter.use('/spaces', watchSpaceRoutes);
apiRouter.use('/v1/watch-spaces', watchSpaceRoutes);

// Mount AI Co-Pilot endpoints (Part 7)
apiRouter.use('/spaces', aiRoutes);
apiRouter.use('/v1/watch-spaces', aiRoutes);

// Mount Dashboard, Analytics & Interaction endpoints (Part 9)
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/v1/dashboard', dashboardRoutes);

// Mount Admin Timeline & Metadata Management routes (Part 9)
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/v1/admin', adminRoutes);

export default apiRouter;


