import { AppError } from '@/middleware/errorHandler';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { NextFunction, Request, Response, Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { UserController } from './user.controller';
import {
    credentialsSchema,
    createUserSchema,
    updateUserSchema,
    userIdParamSchema,
    userQuerySchema,
} from './user.types';

const router: ExpressRouter = Router();
const controller = new UserController();

// Upload Excel — memory storage (diproses langsung, tidak disimpan ke disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls)$/i.test(file.originalname)) cb(null, true);
    else cb(new AppError('Hanya file .xlsx / .xls yang diizinkan', 400));
  },
});

/** Bungkus multer — terjemahkan errornya (mis. file kebesaran) jadi AppError 400 */
function importUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file maksimal 2MB' : err.message;
      return next(new AppError(msg, 400));
    }
    next(new AppError('Gagal membaca file upload', 400));
  });
}

// Semua route user: harus login & Super Admin
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// ── Route statis — HARUS sebelum /:id agar tidak tertangkap params ──
// Template Excel
router.get('/import/template', controller.importTemplate);

// Import user dari Excel (multipart field "file")
router.post('/import', importUpload, controller.importUsers);

// Rekap akun+password utk unduhan (on-the-fly, tidak ada penyimpanan)
router.post('/import/credentials', validate(credentialsSchema), controller.exportCredentials);

// Export semua profil user (untuk HR)
router.get('/export-profile', controller.exportProfile);

// List user — validasi query
router.get('/', validate(userQuerySchema, 'query'), controller.list);

// Stats
router.get('/stats', controller.stats);

// Detail
router.get('/:id', validate(userIdParamSchema, 'params'), controller.detail);

// Create — validasi body
router.post('/', validate(createUserSchema), controller.create);

// Update — validasi body + params
router.put(
  '/:id',
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  controller.update
);

// Delete
router.delete('/:id', validate(userIdParamSchema, 'params'), controller.delete);

export default router;
