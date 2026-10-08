import { authenticate } from '@/middleware/auth';
import { Router, type Router as ExpressRouter } from 'express';
import { NotificationsController } from './notifications.controller';

/**
 * Notifikasi in-app (bell AppHeader) — selalu milik user login sendiri.
 * - GET  /          → { items, unread_count }
 * - PATCH /:id/read → tandai satu
 * - PATCH /read-all → tandai semua
 */
const router: ExpressRouter = Router();
const handlers = new NotificationsController();

router.use(authenticate);

router.get('/', handlers.list);
router.patch('/read-all', handlers.markAllRead);
router.patch('/:id/read', handlers.markRead);

export default router;
