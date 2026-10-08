import type { NextFunction, Request, Response } from 'express';
import {
  employeeIdParamSchema,
  employeeQuerySchema,
} from './employees.types';
import { EmployeesService } from './employees.service';

export class EmployeesController {
  private readonly service = new EmployeesService();

  /** GET /employees — daftar + filter/search */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const f = employeeQuerySchema.parse(req.query ?? {});
      const rows = await this.service.list(f);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  };

  /** GET /employees/:id */
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = employeeIdParamSchema.parse(req.params);
      const row = await this.service.get(id);
      res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  };

  /** POST /employees — ADMIN_CNB */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await this.service.create(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  };

  /** PUT /employees/:id — ADMIN_CNB */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = employeeIdParamSchema.parse(req.params);
      const row = await this.service.update(id, req.body, req.user!.userId);
      res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /employees/:id — ADMIN_CNB */
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = employeeIdParamSchema.parse(req.params);
      await this.service.remove(id, req.user!.userId);
      res.json({ success: true, data: { id } });
    } catch (error) {
      next(error);
    }
  };
}
