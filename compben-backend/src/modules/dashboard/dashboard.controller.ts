import { NextFunction, Request, Response } from 'express';
import { DashboardRepository } from './dashboard.repository';

const dashboardRepository = new DashboardRepository();

export class DashboardController {
  /** GET /api/v1/dashboard/summary — ringkasan utk Super Admin */
  async summary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardRepository.getSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
