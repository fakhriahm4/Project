import { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  /** POST /api/v1/auth/login */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, {
        ip: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.headers['user-agent'],
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/v1/auth/me — profil terbaru dari token */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.me(req.user!.userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/v1/auth/profile — update data diri sendiri */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.updateProfile(req.user!.userId, req.body);
      res.json({ success: true, message: 'Profil berhasil disimpan', data: user });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/v1/auth/change-password */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.changePassword(req.user!.userId, req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/v1/auth/preferences */
  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.updatePreferences(req.user!.userId, req.body);
      res.json({ success: true, message: 'Preferensi disimpan', data: result });
    } catch (error) {
      next(error);
    }
  }
}
