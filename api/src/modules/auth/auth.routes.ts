import { Router, type RequestHandler } from 'express';
import { loginLimiter } from '../../common/middleware/rate-limit';
import { validate } from '../../common/middleware/validate';
import type { AuthController } from './auth.controller';
import { loginSchema } from './auth.schemas';

export function authRoutes(controller: AuthController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post('/login', loginLimiter(), validate(loginSchema, 'body'), controller.login); // POST /auth/login (para el panel)
  router.get('/me', authenticate, controller.me); // GET /auth/me (requiere token: ejemplo de ruta protegida)
  return router;
}
