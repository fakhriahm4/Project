import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { Router, type Router as ExpressRouter } from 'express';
import { EmployeesController } from './employees.controller';
import {
  employeeIdParamSchema,
  employeeSchema,
  employeeUpdateSchema,
} from './employees.types';

/**
 * Master Pegawai (tabel `employees`).
 * - GET   : SUPER_ADMIN, ADMIN_CNB, HR_ADMIN, HR (baca bersama)
 * - WRITE : murni ADMIN_CNB (keputusan Fase 0 — laman Admin C&B)
 */
const router: ExpressRouter = Router();
const handlers = new EmployeesController();

router.use(authenticate);

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR'), handlers.list);
router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR'),
  validate(employeeIdParamSchema, 'params'),
  handlers.get
);
router.post('/', requireRole('ADMIN_CNB'), validate(employeeSchema), handlers.create);
router.put(
  '/:id',
  requireRole('ADMIN_CNB'),
  validate(employeeIdParamSchema, 'params'),
  validate(employeeUpdateSchema),
  handlers.update
);
router.delete(
  '/:id',
  requireRole('ADMIN_CNB'),
  validate(employeeIdParamSchema, 'params'),
  handlers.remove
);

export default router;
