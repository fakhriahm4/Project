import { NextFunction, Request, Response } from 'express';
import { OrganizationService } from './organization.service';
import type { MasterEntity } from './organization.types';

const service = new OrganizationService();

function handle(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Handler generik utk master divisi/jabatan — entity dikunci
 * dari route factory, bukan dari input user.
 */
export function createMasterHandlers(entity: MasterEntity) {
  return {
    list: handle(async (_req, res) => {
      const data = await service.listMaster(entity);
      res.json({ success: true, data });
    }),

    create: handle(async (req, res) => {
      const data = await service.createMaster(entity, req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        message: 'Data berhasil ditambahkan',
        data,
      });
    }),

    update: handle(async (req, res) => {
      const data = await service.updateMaster(
        entity,
        Number(req.params.id),
        req.body,
        req.user!.userId
      );
      res.json({
        success: true,
        message: 'Data berhasil diupdate',
        data,
      });
    }),

    delete: handle(async (req, res) => {
      const result = await service.deleteMaster(
        entity,
        Number(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, ...result });
    }),
  };
}

export const gradeHandlers = {
  list: handle(async (_req, res) => {
    const data = await service.listGrades();
    res.json({ success: true, data });
  }),

  create: handle(async (req, res) => {
    const data = await service.createGrade(req.body, req.user!.userId);
    res.status(201).json({
      success: true,
      message: 'Grade berhasil ditambahkan',
      data,
    });
  }),

  update: handle(async (req, res) => {
    const data = await service.updateGrade(
      Number(req.params.id),
      req.body,
      req.user!.userId
    );
    res.json({
      success: true,
      message: 'Grade berhasil diupdate',
      data,
    });
  }),

  delete: handle(async (req, res) => {
    const result = await service.deleteGrade(
      Number(req.params.id),
      req.user!.userId
    );
    res.json({ success: true, ...result });
  }),
};

export const companyHandlers = {
  list: handle(async (_req, res) => {
    const data = await service.listCompanies();
    res.json({ success: true, data });
  }),

  create: handle(async (req, res) => {
    const data = await service.createCompany(req.body, req.user!.userId);
    res.status(201).json({
      success: true,
      message: 'Perusahaan berhasil ditambahkan',
      data,
    });
  }),

  update: handle(async (req, res) => {
    const data = await service.updateCompany(
      Number(req.params.id),
      req.body,
      req.user!.userId
    );
    res.json({
      success: true,
      message: 'Perusahaan berhasil diupdate',
      data,
    });
  }),

  delete: handle(async (req, res) => {
    const result = await service.deleteCompany(
      Number(req.params.id),
      req.user!.userId
    );
    res.json({ success: true, ...result });
  }),
};
