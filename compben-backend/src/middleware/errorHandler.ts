import logger from '@/config/logger';
import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  logger.error(err.message, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    // Pesan internal (mis. TypeError) jangan bocor ke client
    error: isAppError ? err.message : 'Terjadi kesalahan pada server',
  });
};

export default errorHandler;