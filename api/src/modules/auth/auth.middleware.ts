// Middlewares de seguridad del PANEL. Las rutas públicas de la web NO los usan.
//
//   router.get('/algo-del-panel', authenticate, requireRole('admin'), handler)
//
// `authenticate` se inyecta desde el módulo de auth (ver index.ts) para no depender de globales.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { forbidden, unauthorized } from '../../common/errors/app-error';
import type { Rol } from './admin-user.entity';
import type { AuthService } from './auth.service';

export function createAuthenticate(auth: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const [scheme, token] = header?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw unauthorized('Falta el token de acceso');
    const user = await auth.authenticate(token);
    req.auth = { userId: user.id, rol: user.rol };
    next();
  };
}

/** Exige que el usuario autenticado tenga uno de los roles indicados (usar después de `authenticate`). */
export const requireRole =
  (...roles: Rol[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.rol)) throw forbidden();
    next();
  };
