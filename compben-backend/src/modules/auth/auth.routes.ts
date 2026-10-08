import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { Router, type Router as ExpressRouter } from 'express';
import { AuthController } from './auth.controller';
import {
  changePasswordSchema,
  loginSchema,
  preferencesSchema,
  updateProfileSchema,
} from './auth.types';

const router: ExpressRouter = Router();
const controller = new AuthController();

// Login (public)
router.post('/login', validate(loginSchema), controller.login);

// Profil diri sendiri (wajib login)
router.get('/me', authenticate, controller.me);

// Update data diri (wajib login)
router.put('/profile', authenticate, validate(updateProfileSchema), controller.updateProfile);

// Ganti password (wajib login)
router.put('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);

// Preferensi akun (wajib login)
router.put('/preferences', authenticate, validate(preferencesSchema), controller.updatePreferences);

export default router;
