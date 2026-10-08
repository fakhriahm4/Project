import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { Router, type Router as ExpressRouter } from 'express';
import { RoleController } from './role.controller';
import { createRoleSchema, roleIdParamSchema, updateRoleSchema } from './role.types';

const router: ExpressRouter = Router();
const controller = new RoleController();

// Semua route role: harus login & Super Admin
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', controller.list);
router.post('/', validate(createRoleSchema), controller.create);
router.put(
  '/:id',
  validate(roleIdParamSchema, 'params'),
  validate(updateRoleSchema),
  controller.update
);
router.delete(
  '/:id',
  validate(roleIdParamSchema, 'params'),
  controller.delete
);

export default router;
