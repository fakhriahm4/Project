import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { Router, type Router as ExpressRouter } from 'express';
import { makeCbController, cbSchemaFor } from './cbmaster.controller';
import type { CbResourceKey } from './cbmaster.types';

/**
 * Master C&B — SEMUA endpoint murni role ADMIN_CNB (keputusan Fase 0):
 * super admin / HR_ADMIN / HR / EMPLOYEE → 403.
 *
 *   GET    /cb/components        daftar komponen payroll
 *   POST   /cb/components        buat (validasi Zod)
 *   PUT    /cb/components/:id    ubah
 *   DELETE /cb/components/:id    hapus
 *   …idem structures, bpjs, tax, deductions, overtime-rules
 */
const router: ExpressRouter = Router();

router.use(authenticate, requireRole('ADMIN_CNB'));

function mount(path: string, key: CbResourceKey): void {
  const c = makeCbController(key);
  const schema = cbSchemaFor(key);
  router.get(path, c.list);
  router.post(path, validate(schema.create), c.create);
  router.put(`${path}/:id`, validate(schema.update), c.update);
  router.delete(`${path}/:id`, c.remove);
}

mount('/components', 'components');
mount('/structures', 'structures');
mount('/bpjs', 'bpjs');
mount('/tax', 'tax');
mount('/deductions', 'deductions');
mount('/overtime-rules', 'overtimeRules');

export default router;
