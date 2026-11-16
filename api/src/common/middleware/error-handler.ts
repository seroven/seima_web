import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `La ruta ${req.method} ${req.path} no existe` } });
};

// Un solo formato de error para toda la API: { error: { code, message, details? } }
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }

  // Errores de body-parser (JSON mal formado, cuerpo demasiado grande)
  const tipo = (err as { type?: string }).type;
  if (tipo === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'El cuerpo no es un JSON válido' } });
    return;
  }
  if (tipo === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo es demasiado grande' } });
    return;
  }

  req.log?.error({ err }, 'Error no controlado');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: env.isProd ? 'Ocurrió un error interno' : String((err as Error)?.message ?? err) },
  });
};
