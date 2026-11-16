import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { validationError } from '../errors/app-error';

// Mensajes de validación en español
z.config(z.locales.es());

type Source = 'body' | 'query' | 'params';

/**
 * Valida `req.body | query | params` con un esquema Zod. Lo ya validado (y transformado: números, trims…)
 * queda en `res.locals.validated[source]`; léelo con `validated(res, 'body')`.
 * (En Express 5 `req.query` es de solo lectura, por eso no se reescribe.)
 */
export const validate =
  (schema: z.ZodType, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw validationError(result.error.issues.map((i) => ({ campo: i.path.join('.') || source, mensaje: i.message })));
    }
    res.locals.validated = { ...res.locals.validated, [source]: result.data };
    next();
  };

export const validated = <T>(res: Response, source: Source): T => res.locals.validated?.[source] as T;
