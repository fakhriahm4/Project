import { NextFunction, Request, Response } from 'express';
import { RoleService } from './role.service';

const roleService = new RoleService();

export class RoleController {
  /** GET /roles — daftar role + jumlah user */
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await roleService.list();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  /** POST /roles — buat role baru */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await roleService.create(req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        message: 'Role berhasil dibuat',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /roles/:id — ubah nama/deskripsi/status */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await roleService.update(
        Number(req.params.id),
        req.body,
        req.user!.userId
      );
      res.json({
        success: true,
        message: 'Role berhasil diupdate',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /roles/:id — hapus role yang tidak dipakai */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await roleService.delete(
        Number(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
