import { NextFunction, Request, Response } from 'express';
import { NotificationsRepository } from './notifications.repository';

const repo = new NotificationsRepository();

/**
 * Inbox notifikasi in-app — semua endpoint milik user login sendiri
 * (tidak perlu RBAC; hanya membaca/menandai milik sendiri).
 */
export class NotificationsController {
  /** GET /api/v1/notifications — daftar + unread_count */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await repo.listForUser(req.user!.userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/v1/notifications/:id/read — tandai satu sudah dibaca */
  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'ID tidak valid' });
      }
      const updated = await repo.markRead(req.user!.userId, id);
      res.json({
        success: true,
        data: { id, updated, message: updated ? 'Notifikasi ditandai sudah dibaca' : 'Tidak ada perubahan' },
      });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/v1/notifications/read-all — tandai semua sudah dibaca */
  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await repo.markAllRead(req.user!.userId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }
}
