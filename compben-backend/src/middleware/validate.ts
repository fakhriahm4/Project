import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from './errorHandler';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Format ZodError jadi pesan yang enak dibaca
 */
function formatZodError(error: ZodError): string {
  // Zod v4: gunakan .issues (bukan .errors)
  const messages = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return messages.join(', ');
}

/**
 * Middleware untuk validasi request dengan Zod
 *
 * Contoh penggunaan:
 *   router.post('/', validate(createUserSchema), controller.create)
 *   router.get('/', validate(userQuerySchema, 'query'), controller.list)
 */
export function validate(
  schema: ZodSchema,
  source: ValidationSource = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = req[source];

      // Parse & validasi
      const parsed = schema.parse(data);

      // Replace dengan hasil parse.
      // Catatan: di Express 4, req.query adalah getter-only di prototype,
      // sehingga `req.query = x` akan gagal (strict mode). Kita shadow
      // dengan own property di instance request agar controller yang
      // membaca req.query mendapat hasil parse (default + coercion zod).
      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'query') {
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        (req as any).validatedQuery = parsed;
      } else if (source === 'params') {
        Object.defineProperty(req, 'params', {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        (req as any).validatedParams = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(formatZodError(error), 400));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware untuk validasi multiple source sekaligus
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        (req as any).validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(formatZodError(error), 400));
      } else {
        next(error);
      }
    }
  };
}