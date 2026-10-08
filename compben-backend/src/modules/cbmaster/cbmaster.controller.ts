import type { NextFunction, Request, Response } from 'express';
import { CbmasterService } from './cbmaster.service';
import { CB_SCHEMAS, idParamSchema, type CbResourceKey } from './cbmaster.types';

/**
 * Controller generik per resource: GET /, POST /, PUT /:id, DELETE /:id
 * (pola try/catch + next(error) — sama seperti controller lain).
 */
export function makeCbController(key: CbResourceKey) {
  const service = new CbmasterService();

  const list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await service.list(key);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  };

  const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await service.create(key, req.body, req.user!.userId);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  };

  const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const row = await service.update(key, id, req.body, req.user!.userId);
      res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  };

  const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await service.remove(key, id, req.user!.userId);
      res.json({ success: true, data: { id } });
    } catch (error) {
      next(error);
    }
  };

  return { list, create, update, remove };
}

export function cbSchemaFor(key: CbResourceKey) {
  return CB_SCHEMAS[key];
}
