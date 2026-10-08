import type { NextFunction, Request, Response } from 'express';
import { attendanceService, payrollPeriodService } from './payroll.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Payroll Period — /api/v1/payroll/periods (murni ADMIN_CNB) */
export class PayrollPeriodController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await payrollPeriodService.list() });
    } catch (e) {
      next(e);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await payrollPeriodService.create(
        req.body,
        req.user!.userId
      );
      res.status(201).json({ success: true, message: 'Periode dibuat', data: row });
    } catch (e) {
      next(e);
    }
  }

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await payrollPeriodService.detail(Number(req.params.id));
      res.json({ success: true, data: row });
    } catch (e) {
      next(e);
    }
  }

  async lock(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await payrollPeriodService.lock(
        Number(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, message: 'Absensi dikunci', data: row });
    } catch (e) {
      next(e);
    }
  }

  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await payrollPeriodService.pay(
        Number(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, message: 'Periode ditandai dibayar', data: row });
    } catch (e) {
      next(e);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await payrollPeriodService.remove(
        Number(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, ...result });
    } catch (e) {
      next(e);
    }
  }
}

/** Absensi — /api/v1/attendance (murni ADMIN_CNB) */
export class AttendanceController {
  async matrix(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.matrix(
        Number(req.query.period_id)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async saveCell(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await attendanceService.saveCell(req.body, req.user!.userId);
      res.json({ success: true, message: 'Absensi disimpan', data: row });
    } catch (e) {
      next(e);
    }
  }

  async deleteCell(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await attendanceService.deleteCell(
        Number(req.query.employee_id),
        String(req.query.tanggal),
        req.user!.userId
      );
      res.json({ success: true, ...result });
    } catch (e) {
      next(e);
    }
  }

  async import(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await attendanceService.importFile(
        req.file,
        req.body.period_id,
        req.user!.userId
      );
      res.json({ success: true, message: 'Impor selesai', data: result });
    } catch (e) {
      next(e);
    }
  }

  async template(_req: Request, res: Response, next: NextFunction) {
    try {
      const buf = await attendanceService.templateBuffer();
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="template-absensi.xlsx"'
      );
      res.send(buf);
    } catch (e) {
      next(e);
    }
  }
}
