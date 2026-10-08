import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { Router, type Router as ExpressRouter } from 'express';
import { DashboardController } from './dashboard.controller';

const router: ExpressRouter = Router();
const controller = new DashboardController();

// Ringkasan dashboard: khusus Super Admin
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/summary', controller.summary);

export default router;
