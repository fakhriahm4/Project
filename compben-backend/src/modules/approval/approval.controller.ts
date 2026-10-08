import { NextFunction, Request, Response } from 'express';
import { approvalService } from './approval.service';

export class ApprovalController {
  /** POST /api/v1/approvals — buat pengajuan (authenticated) */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await approvalService.create(
        req.body,
        req.user!.userId
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/v1/approvals?status= — daftar pengajuan (SUPER_ADMIN, HR_ADMIN) */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const data = await approvalService.list(status);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/v1/approvals/:id/decide — approve/reject satu step */
  async decide(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = await approvalService.decide(
        id,
        req.body,
        req.user!.userId,
        req.user!.roleCode
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
