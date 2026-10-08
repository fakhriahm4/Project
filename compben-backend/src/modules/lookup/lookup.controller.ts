import { NextFunction, Request, Response } from 'express';
import { LookupRepository } from './lookup.repository';

const lookupRepository = new LookupRepository();

export class LookupController {
  /** GET /api/v1/lookups — semua data referensi dalam 1 response */
  async all(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await lookupRepository.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
