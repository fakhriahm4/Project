import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@utils/audit';
import { NextFunction, Request, Response } from 'express';
import { UserBulkService } from './user.bulk.service';
import { UserService } from './user.service';

const userService = new UserService();
const userBulkService = new UserBulkService();

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.list(req.query as any, req.user!.userId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.detail(Number(req.params.id));
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        message: 'User berhasil dibuat',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(
        Number(req.params.id),
        req.body,
        req.user!.userId
      );
      res.json({
        success: true,
        message: 'User berhasil diupdate',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.delete(
        Number(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await userService.stats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /** GET /users/import/template — unduh template Excel */
  async importTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const buf = await userBulkService.templateBuffer();
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader('Content-Disposition', 'attachment; filename="template-import-user.xlsx"');
      res.send(buf);
    } catch (error) {
      next(error);
    }
  }

  /** POST /users/import — import user dari Excel (multipart field "file") */
  async importUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Field teks dari multipart: default 'dob' (kebijakan saat ini:
      // password awal = tanggal lahir DDMMYYYY)
      const mode = req.body?.password_mode === 'random' ? 'random' : 'dob';
      const result = await userBulkService.importFromExcel(req.file!, req.user!.userId, mode);
      res.json({
        success: true,
        message: `Import selesai: ${result.summary.imported} user dibuat, ${result.summary.failed} baris gagal`,
        data: { password_mode: mode, ...result },
      });
    } catch (error) {
      next(error);
    }
  }

  /** POST /users/import/credentials — rekap akun+password (xlsx, on-the-fly) */
  async exportCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const buf = await userBulkService.credentialsBuffer(req.body.accounts);
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="rekap-akun-${date}.xlsx"`);
      res.send(buf);
    } catch (error) {
      next(error);
    }
  }

  /** GET /users/export-profile?status= — unduh semua profil user (xlsx) utk HR */
  async exportProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
        return next(new AppError('Status harus ACTIVE atau INACTIVE', 400));
      }

      const buf = await userBulkService.exportProfileBuffer(status);

      // Audit: penarikan data pribadi wajib tercatat
      await writeAuditLog({
        user_id: req.user!.userId,
        action: 'EXPORT',
        table_name: 'users',
        record_id: null,
        new_value: { jenis: 'profil_user', filter_status: status ?? 'ALL' },
      });

      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="profil-user-${date}.xlsx"`);
      res.send(buf);
    } catch (error) {
      next(error);
    }
  }
}