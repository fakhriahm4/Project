import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { Router, type Router as ExpressRouter } from 'express';
import { ApprovalController } from './approval.controller';
import {
  approvalIdParamSchema,
  approvalQuerySchema,
  createApprovalSchema,
  decideApprovalSchema,
} from './approval.types';

/**
 * Approval engine generik.
 * - POST /        : buat pengajuan — semua role terotentikasi
 *                   (dipakai modul masa depan: reimbursement, cuti, …)
 * - GET  /        : daftar pengajuan — SUPER_ADMIN, HR_ADMIN (halaman Pending/History)
 * - POST /:id/decide : putuskan satu step — role approver step tsb
 *                   (SUPER_ADMIN boleh override)
 */
const router: ExpressRouter = Router();
const handlers = new ApprovalController();

router.use(authenticate);

router.post('/', validate(createApprovalSchema), handlers.create);
router.get(
  '/',
  requireRole('SUPER_ADMIN', 'HR_ADMIN'),
  validate(approvalQuerySchema, 'query'),
  handlers.list
);
router.post(
  '/:id/decide',
  requireRole('SUPER_ADMIN', 'HR_ADMIN'),
  validate(approvalIdParamSchema, 'params'),
  validate(decideApprovalSchema),
  handlers.decide
);

export default router;
