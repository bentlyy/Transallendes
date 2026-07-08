import { RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

export const validateZod = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const isDev = process.env.NODE_ENV === 'development';
      const zodError = result.error as ZodError;

      const details = zodError.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      const message = isDev
        ? `Validation failed: ${details.map((d: any) => `${d.field}: ${d.message}`).join('; ')}`
        : 'Validation failed';

      const error = new BadRequestError(message);
      (error as any).details = isDev ? details : undefined;
      return next(error);
    }

    req[source] = result.data;
    next();
  };
};
