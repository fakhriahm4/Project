import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { Router, type Router as ExpressRouter } from 'express';
import { companyHandlers, createMasterHandlers, gradeHandlers } from './organization.controller';
import {
  createCompanySchema,
  createGradeSchema,
  createMasterSchema,
  idParamSchema,
  updateCompanySchema,
  updateGradeSchema,
  updateMasterSchema,
  type MasterEntity,
} from './organization.types';

/**
 * Route master generik (divisi / jabatan):
 * - GET  : semua role terotentikasi (konsisten dgn lookups)
 * - Tulis: Super Admin saja
 */
function buildMasterRoutes(entity: MasterEntity): ExpressRouter {
  const router: ExpressRouter = Router();
  const handlers = createMasterHandlers(entity);

  router.use(authenticate);

  router.get('/', handlers.list);
  router.post(
    '/',
    requireRole('SUPER_ADMIN'),
    validate(createMasterSchema),
    handlers.create
  );
  router.put(
    '/:id',
    requireRole('SUPER_ADMIN'),
    validate(idParamSchema, 'params'),
    validate(updateMasterSchema),
    handlers.update
  );
  router.delete(
    '/:id',
    requireRole('SUPER_ADMIN'),
    validate(idParamSchema, 'params'),
    handlers.delete
  );

  return router;
}

function buildCompanyRoutes(): ExpressRouter {
  const router: ExpressRouter = Router();

  router.use(authenticate);

  router.get('/', companyHandlers.list);
  router.post(
    '/',
    requireRole('SUPER_ADMIN'),
    validate(createCompanySchema),
    companyHandlers.create
  );
  router.put(
    '/:id',
    requireRole('SUPER_ADMIN'),
    validate(idParamSchema, 'params'),
    validate(updateCompanySchema),
    companyHandlers.update
  );
  router.delete(
    '/:id',
    requireRole('SUPER_ADMIN'),
    validate(idParamSchema, 'params'),
    companyHandlers.delete
  );

  return router;
}

/**
 * Route grade:
 * - GET  : semua role terotentikasi
 * - Tulis: SUPER_ADMIN & ADMIN_CNB (perubahan tahunan struktur kompensasi)
 */
function buildGradeRoutes(): ExpressRouter {
  const router: ExpressRouter = Router();
  const handlers = gradeHandlers;

  router.use(authenticate);

  router.get('/', handlers.list);
  router.post(
    '/',
    requireRole('SUPER_ADMIN', 'ADMIN_CNB'),
    validate(createGradeSchema),
    handlers.create
  );
  router.put(
    '/:id',
    requireRole('SUPER_ADMIN', 'ADMIN_CNB'),
    validate(idParamSchema, 'params'),
    validate(updateGradeSchema),
    handlers.update
  );
  router.delete(
    '/:id',
    requireRole('SUPER_ADMIN', 'ADMIN_CNB'),
    validate(idParamSchema, 'params'),
    handlers.delete
  );

  return router;
}

export const divisiRoutes = buildMasterRoutes('divisi');
export const jabatanRoutes = buildMasterRoutes('jabatan');
export const companyRoutes = buildCompanyRoutes();
export const gradeRoutes = buildGradeRoutes();
