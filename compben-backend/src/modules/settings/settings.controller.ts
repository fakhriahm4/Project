import { AppError } from '@/middleware/errorHandler';
import { NextFunction, Request, Response } from 'express';
import { settingsService } from './settings.service';
import { isSettingsSection, type SettingsSection } from './settings.types';

function sectionOf(req: Request): SettingsSection {
  const s = String(req.params.section);
  if (!isSettingsSection(s)) {
    throw new AppError(`Section settings "${s}" tidak dikenal`, 404);
  }
  return s;
}

export class SettingsController {
  /** GET /api/v1/settings/:section — Super Admin */
  async getSection(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.get(sectionOf(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/v1/settings/:section — Super Admin */
  async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = await settingsService.update(
        sectionOf(req),
        req.body,
        userId
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/v1/settings/public — tanpa auth (identitas + preferensi tampilan) */
  async getPublic(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getPublic();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
