import { query } from '@/config/database';
import { JWT_SECRET } from '@/config/env';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

interface JwtPayload {
  userId: number;
  username: string;
  roleId: number;
  roleCode: string;
}

/**
 * Middleware untuk verifikasi JWT token
 * Setelah middleware ini, req.user akan tersedia
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // 1. Ambil token dari header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token tidak ditemukan', 401);
    }

    const token = authHeader.substring(7); // Hapus "Bearer "

    // 2. Verifikasi JWT
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError('Token sudah kadaluarsa', 401);
      }
      throw new AppError('Token tidak valid', 401);
    }

    // 3. Cek user masih aktif di database
    const result = await query(
      `SELECT u.id, u.username, u.role_id, r.kode AS role_kode, u.status
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User tidak ditemukan atau tidak aktif', 401);
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE') {
      throw new AppError('Akun Anda tidak aktif', 403);
    }

    // 4. Set user ke request
    req.user = {
      userId: user.id,
      username: user.username,
      roleId: user.role_id,
      roleCode: user.role_kode,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware opsional — verifikasi token jika ada,
 * tapi tidak wajib (untuk route public)
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

      const result = await query(
        `SELECT u.id, u.username, u.role_id, r.kode AS role_kode, u.status
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1 AND u.is_active = TRUE`,
        [payload.userId]
      );

      if (result.rows.length > 0 && result.rows[0].status === 'ACTIVE') {
        const user = result.rows[0];
        req.user = {
          userId: user.id,
          username: user.username,
          roleId: user.role_id,
          roleCode: user.role_kode,
        };
      }
    } catch {
      // Ignore error — route public
    }

    next();
  } catch (error) {
    next(error);
  }
}