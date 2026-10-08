import { authenticate } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { NextFunction, Request, Response, Router, type Router as ExpressRouter } from 'express';
import { SettingsController } from './settings.controller';
import { SECTION_SCHEMAS, isSettingsSection, type SettingsSection } from './settings.types';

/**
 * System Configuration — per-section.
 * - /public : tanpa auth (identitas aplikasi + preferensi tampilan utk login page & semua role)
 * - /:section (GET/PUT) : Super Admin; section harus dikenal; body divalidasi
 *   schema section tsb (semua partial — PUT boleh kirim sebagian key).
 * - Pengecualian (Fase 0): section `cb_parameter` (Parameter C&B) juga boleh
 *   diakses role ADMIN_CNB — itu laman Admin C&B; section lain tetap Super Admin.
 */

/** Validasi section + schema per section (baru setelah params terbaca) */
function validateSection(req: Request, _res: Response, next: NextFunction) {
  const s = String(req.params.section);
  if (!isSettingsSection(s)) {
    return next(new AppError(`Section settings "${s}" tidak dikenal`, 404));
  }
  return validate(SECTION_SCHEMAS[s as SettingsSection])(req, _res, next);
}

/** RBAC per section: cb_parameter → SUPER_ADMIN + ADMIN_CNB; lainnya → SUPER_ADMIN */
function sectionRole(req: Request, _res: Response, next: NextFunction) {
  const allowed =
    req.params.section === 'cb_parameter'
      ? ['SUPER_ADMIN', 'ADMIN_CNB']
      : ['SUPER_ADMIN'];
  if (!req.user || !allowed.includes(req.user.roleCode)) {
    return next(new AppError('Anda tidak memiliki akses ke resource ini', 403));
  }
  return next();
}

const router: ExpressRouter = Router();
const handlers = new SettingsController();

router.get('/public', handlers.getPublic);

router.get('/:section', authenticate, sectionRole, handlers.getSection);
router.put(
  '/:section',
  authenticate,
  sectionRole,
  validateSection,
  handlers.updateSection
);

export default router;
