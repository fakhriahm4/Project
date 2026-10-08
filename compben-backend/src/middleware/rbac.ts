import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';

type RoleCode = 'SUPER_ADMIN' | 'ADMIN_CNB' | 'HR_ADMIN' | 'HR' | 'EMPLOYEE';

/**
 * Middleware untuk cek apakah user punya salah satu role yang diizinkan
 *
 * Contoh penggunaan:
 *   router.get('/', authenticate, requireRole('SUPER_ADMIN'), controller.list)
 *   router.post('/', authenticate, requireRole('SUPER_ADMIN', 'HR'), controller.create)
 */
export function requireRole(...allowedRoles: RoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Anda belum login', 401);
      }

      if (!allowedRoles.includes(req.user.roleCode as RoleCode)) {
        throw new AppError(
          'Anda tidak memiliki akses ke resource ini',
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware untuk cek permission granular (opsional, fase lanjutan)
 * Format permission: "module.action" → contoh: "user.create"
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Anda belum login', 401);
      }

      // Super Admin bypass semua permission
      if (req.user.roleCode === 'SUPER_ADMIN') {
        return next();
      }

      // TODO: Query permission dari database
      // const userPermissions = await getPermissionsByRoleId(req.user.roleId);
      // const hasPermission = permissions.some(p => userPermissions.includes(p));
      // if (!hasPermission) throw new AppError('Akses ditolak', 403);

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware untuk cek apakah user adalah owner data
 * (misal: employee hanya bisa akses data miliknya sendiri)
 */
export function requireOwnerOrRole(
  getOwnerId: (req: Request) => number,
  ...allowedRoles: RoleCode[]
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Anda belum login', 401);
      }

      // Kalau punya role yang diizinkan, boleh akses
      if (allowedRoles.includes(req.user.roleCode as RoleCode)) {
        return next();
      }

      // Kalau bukan, cek apakah dia owner data
      const ownerId = getOwnerId(req);
      if (req.user.userId !== ownerId) {
        throw new AppError('Anda hanya bisa mengakses data milik sendiri', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}