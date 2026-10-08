import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { Router, type Router as ExpressRouter } from 'express';
import { LookupController } from './lookup.controller';

const router: ExpressRouter = Router();
const controller = new LookupController();

// Data referensi dipakai oleh form (user management dkk) — wajib login
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', controller.all);

export default router;
