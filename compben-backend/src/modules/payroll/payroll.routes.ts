import { AppError } from '@/middleware/errorHandler';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { NextFunction, Request, Response, Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { AttendanceController, PayrollPeriodController } from './payroll.controller';
import {
  cellQuerySchema,
  cellSchema,
  createPeriodSchema,
  matrixQuerySchema,
  periodIdParamSchema,
} from './payroll.types';

/**
 * Fase 1 — Payroll Period & Attendance. SEMUA murni ADMIN_CNB
 * (konsisten dgn Master C&B): SUPER_ADMIN / HR / EMPLOYEE → 403.
 *
 *   /payroll/periods   GET / · POST / · GET /:id · PUT /:id/lock ·
 *                      PUT /:id/pay · DELETE /:id
 *   /attendance        GET /template · GET /matrix · POST /import ·
 *                      PUT /cell · DELETE /cell
 */

const periodController = new PayrollPeriodController();
const attendanceController = new AttendanceController();

// Upload Excel absensi — memory storage (field "file", maks 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls)$/i.test(file.originalname)) cb(null, true);
    else cb(new AppError('Hanya file .xlsx / .xls yang diizinkan', 400));
  },
});

function importUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file maksimal 5MB' : err.message;
      return next(new AppError(msg, 400));
    }
    next(new AppError('Gagal membaca file upload', 400));
  });
}

export const periodRoutes: ExpressRouter = Router();
periodRoutes.use(authenticate, requireRole('ADMIN_CNB'));
periodRoutes.get('/', periodController.list);
periodRoutes.post('/', validate(createPeriodSchema), periodController.create);
periodRoutes.get('/:id', validate(periodIdParamSchema, 'params'), periodController.detail);
periodRoutes.put('/:id/lock', validate(periodIdParamSchema, 'params'), periodController.lock);
periodRoutes.put('/:id/pay', validate(periodIdParamSchema, 'params'), periodController.pay);
periodRoutes.delete('/:id', validate(periodIdParamSchema, 'params'), periodController.remove);

export const attendanceRoutes: ExpressRouter = Router();
attendanceRoutes.use(authenticate, requireRole('ADMIN_CNB'));
attendanceRoutes.get('/template', attendanceController.template);
attendanceRoutes.get(
  '/matrix',
  validate(matrixQuerySchema, 'query'),
  attendanceController.matrix
);
attendanceRoutes.post('/import', importUpload, attendanceController.import);
attendanceRoutes.put('/cell', validate(cellSchema), attendanceController.saveCell);
attendanceRoutes.delete(
  '/cell',
  validate(cellQuerySchema, 'query'),
  attendanceController.deleteCell
);

// default export ikut periodRoutes (kebutuhan import utama)
export default periodRoutes;
